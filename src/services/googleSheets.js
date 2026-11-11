const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const config = require('../config/env');
const settings = require('./settings');
const googleAuth = require('./googleAuth');

/**
 * Normalizes header strings for flexible column matching.
 */
function normalizeHeader(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Identifies column mapping across rows (supports both standard row-1 headers and row-2/3/4 hierarchical sub-headers).
 */
function identifyColumnsFromRows(rows) {
  const mapping = {
    headerRowIdx: 0,
    nameIdx: -1,
    dobIdx: -1,
    dayIdx: -1,
    monthIdx: -1,
    yearIdx: -1,
    phoneIdx: -1,
    branchIdx: -1
  };

  const maxScanRows = Math.min(rows.length, 6);

  // 1. Identify which row is the deepest primary header row (contains Name and/or Phone)
  let bestHeaderRowIdx = 0;
  for (let r = 0; r < maxScanRows; r++) {
    const row = rows[r] || [];
    let hasName = false;
    let hasPhone = false;

    row.forEach(col => {
      const norm = normalizeHeader(col);
      if (norm.includes('nameofstudent') || norm === 'studentname' || norm === 'name' || norm.includes('fullname') || norm.includes('applicant')) {
        hasName = true;
      }
      if (norm.includes('contactno') || norm.includes('whatsapp') || norm.includes('phone') || norm.includes('mobile') || norm.includes('tel')) {
        hasPhone = true;
      }
    });

    if (hasName && hasPhone) {
      bestHeaderRowIdx = r;
      break;
    }
  }

  mapping.headerRowIdx = bestHeaderRowIdx;

  // 2. Scan across ALL header rows (0 through bestHeaderRowIdx) to build complete mapping!
  // This seamlessly handles merged/split headers (e.g. Row 1: "Date Of Birth", Row 2: "DD/MM/YY" or "Date/Month/Year")
  for (let r = 0; r <= bestHeaderRowIdx; r++) {
    const row = rows[r] || [];
    row.forEach((col, idx) => {
      const norm = normalizeHeader(col);

      if (mapping.nameIdx === -1 && (norm.includes('nameofstudent') || norm === 'studentname' || norm === 'name' || norm.includes('fullname') || norm.includes('applicant'))) {
        mapping.nameIdx = idx;
      }
      if (mapping.phoneIdx === -1 && (norm.includes('contactno') || norm.includes('whatsapp') || norm.includes('phone') || norm.includes('mobile') || norm.includes('tel'))) {
        mapping.phoneIdx = idx;
      }
      if (mapping.branchIdx === -1 && (norm === 'source' || norm.includes('branch') || norm.includes('location') || norm.includes('center') || norm.includes('campus'))) {
        mapping.branchIdx = idx;
      }
      if (mapping.dobIdx === -1 && (
        norm.includes('dateofbirth') || 
        norm === 'dob' || 
        norm.includes('birthdate') || 
        norm.includes('bday') ||
        norm.includes('ddmmyy') ||
        norm.includes('ddmmyyyy')
      )) {
        mapping.dobIdx = idx;
      }
      if (mapping.dayIdx === -1 && (norm === 'date' || norm === 'day') && idx >= 4) {
        mapping.dayIdx = idx;
      }
      if (mapping.monthIdx === -1 && norm === 'month') {
        mapping.monthIdx = idx;
      }
      if (mapping.yearIdx === -1 && norm === 'year') {
        mapping.yearIdx = idx;
      }
    });
  }

  return mapping;
}

/**
 * Returns an active Google Sheets API client (OAuth2 user session if signed in, or Service Account credentials.json).
 */
function getSheetsClient() {
  const credsPath = config.GOOGLE_CREDENTIALS_PATH;
  const hasCreds = fs.existsSync(credsPath);

  // Check 1: Google OAuth2 (Sign In with Google)
  const oauthSheets = googleAuth.getAuthenticatedSheetsClient();
  const oauthStatus = googleAuth.getAuthStatus();

  if (oauthSheets && oauthStatus.signedIn) {
    return {
      client: oauthSheets,
      authType: `OAuth2 (${oauthStatus.userEmail})`
    };
  }

  // Check 2: Service Account (credentials.json)
  if (hasCreds) {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: credsPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
      });
      return {
        client: google.sheets({ version: 'v4', auth }),
        authType: 'Service Account'
      };
    } catch (e) {
      console.warn('[GoogleSheets] Service account init error:', e.message);
    }
  }

  return null;
}

/**
 * Fetches and parses student records from a single branch sheet.
 */
async function fetchBranchStudents(branch, sheetsClientWrapper) {
  const spreadsheetId = branch.spreadsheetId;
  const requestedSheet = branch.sheetName || 'INQUIRY DETAILS 2026/27';

  if (!spreadsheetId) {
    return {
      branchId: branch.id,
      branchName: branch.name,
      status: 'NOT_CONFIGURED',
      students: [],
      error: 'Spreadsheet ID is missing.'
    };
  }

  const { client: sheets, authType } = sheetsClientWrapper;

  try {
    // 1. Fetch metadata to resolve exact sheet tab title dynamically (handles slashes/spaces)
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const normRequested = normalizeHeader(requestedSheet);

    let matchedSheet = meta.data.sheets.find(s => {
      const normTitle = normalizeHeader(s.properties.title);
      return normTitle === normRequested;
    });

    if (!matchedSheet) {
      matchedSheet = meta.data.sheets.find(s => normalizeHeader(s.properties.title).includes('inquiry')) || meta.data.sheets[0];
    }

    const exactTitle = matchedSheet.properties.title;

    // 2. Fetch values using properly quoted sheet range: `'<Title>'!A1:Z`
    const range = `'${exactTitle}'!A1:Z`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      return {
        branchId: branch.id,
        branchName: branch.name,
        sheetTitle: exactTitle,
        status: 'CONNECTED_EMPTY',
        students: [],
        count: 0
      };
    }

    // 3. Smart multi-row header mapping
    const mapping = identifyColumnsFromRows(rows);
    const dataRows = rows.slice(mapping.headerRowIdx + 1);

    const students = [];
    dataRows.forEach((row, index) => {
      if (!row || !row.length) return;

      let name = mapping.nameIdx !== -1 ? (row[mapping.nameIdx] || '').trim() : '';
      let phone = mapping.phoneIdx !== -1 ? (row[mapping.phoneIdx] || '').trim() : '';
      let branchName = branch.name || (mapping.branchIdx !== -1 && row[mapping.branchIdx] ? row[mapping.branchIdx].trim() : 'College');

      // Check combined DOB column vs split Date/Month/Year columns
      let dob = '';
      if (mapping.dobIdx !== -1 && row[mapping.dobIdx] && (String(row[mapping.dobIdx]).includes('/') || String(row[mapping.dobIdx]).includes('-') || String(row[mapping.dobIdx]).includes('.'))) {
        dob = String(row[mapping.dobIdx]).trim();
      } else if (mapping.dayIdx !== -1 && mapping.monthIdx !== -1 && row[mapping.dayIdx] && row[mapping.monthIdx]) {
        const d = String(row[mapping.dayIdx]).trim();
        const m = String(row[mapping.monthIdx]).trim();
        const y = mapping.yearIdx !== -1 && row[mapping.yearIdx] ? String(row[mapping.yearIdx]).trim() : '2020';
        dob = `${d}/${m}/${y}`;
      } else if (mapping.dobIdx !== -1 && row[mapping.dobIdx]) {
        dob = String(row[mapping.dobIdx]).trim();
      }

      if (phone.includes('/')) {
        phone = phone.split('/')[0].trim();
      }

      if (name || phone || dob) {
        students.push({
          id: `${branch.id}_row_${mapping.headerRowIdx + index + 2}`,
          name: name || `Inquirer (${phone || 'Student'})`,
          dob,
          phone,
          branch: branchName,
          branchId: branch.id,
          branchCustomTemplate: branch.customTemplate || null
        });
      }
    });

    return {
      branchId: branch.id,
      branchName: branch.name,
      sheetTitle: exactTitle,
      status: 'CONNECTED',
      count: students.length,
      students
    };
  } catch (err) {
    console.error(`[GoogleSheets] Error fetching branch "${branch.name}":`, err.message);
    return {
      branchId: branch.id,
      branchName: branch.name,
      status: 'ERROR',
      students: [],
      error: err.message
    };
  }
}

let cachedSheetResult = null;
let lastFetchTime = 0;
let inflightFetchPromise = null;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes in-memory cache to prevent Google Sheets rate-limiting

/**
 * Main aggregator: Fetches student records from all enabled branches.
 */
async function fetchStudentsFromSheet(forceRefresh = false) {
  if (!forceRefresh && cachedSheetResult && (Date.now() - lastFetchTime < CACHE_TTL_MS)) {
    return cachedSheetResult;
  }

  if (!forceRefresh && inflightFetchPromise) {
    return inflightFetchPromise;
  }

  inflightFetchPromise = (async () => {
    const currentSettings = settings.loadSettings();
    const sheetsClientWrapper = getSheetsClient();

    if (!sheetsClientWrapper) {
      return {
        source: 'GOOGLE_SHEETS',
        status: 'AUTH_REQUIRED',
        students: [],
        branchesReport: [],
        warning: 'Please sign in with Google or configure credentials.json in Settings.'
      };
    }

    // Get active branches
    const activeBranches = (currentSettings.branches || []).filter(b => b.enabled !== false && b.spreadsheetId);

    if (activeBranches.length === 0) {
      return {
        source: 'GOOGLE_SHEETS',
        status: 'NOT_CONFIGURED',
        students: [],
        branchesReport: [],
        totalBranches: (currentSettings.branches || []).length,
        connectedBranches: 0,
        warning: 'No active branch sheets found. Click "Branches" to add your Google Sheets.'
      };
    }

    // Fetch all active branch sheets in parallel
    console.log(`[GoogleSheets] Syncing ${activeBranches.length} active branch sheet(s)...`);
    const branchPromises = activeBranches.map(branch => fetchBranchStudents(branch, sheetsClientWrapper));
    const settled = await Promise.all(branchPromises);

    const aggregatedStudents = [];
    const branchesReport = [];

    settled.forEach(report => {
      branchesReport.push({
        id: report.branchId,
        name: report.branchName,
        status: report.status,
        count: report.count || 0,
        sheetTitle: report.sheetTitle || 'N/A',
        error: report.error || null
      });

      if (report.students && report.students.length > 0) {
        aggregatedStudents.push(...report.students);
      }
    });

    const connectedCount = branchesReport.filter(r => r.status === 'CONNECTED').length;
    console.log(`[GoogleSheets] Multi-branch sync complete: ${aggregatedStudents.length} total students from ${connectedCount}/${activeBranches.length} branch(es).`);

    const result = {
      source: 'GOOGLE_SHEETS',
      status: connectedCount > 0 ? 'CONNECTED' : 'ERROR',
      authType: sheetsClientWrapper.authType,
      totalBranches: activeBranches.length,
      connectedBranches: connectedCount,
      branchesReport,
      students: aggregatedStudents,
      message: `Synced ${aggregatedStudents.length} students across ${connectedCount} branch sheet(s).`
    };

    cachedSheetResult = result;
    lastFetchTime = Date.now();
    return result;
  })();

  try {
    return await inflightFetchPromise;
  } finally {
    inflightFetchPromise = null;
  }
}

/**
 * Validates Google Sheets connection health across all branches or a single branch.
 */
async function testGoogleSheetsConnection(specificBranchId = null) {
  if (specificBranchId) {
    const currentSettings = settings.loadSettings();
    const branch = currentSettings.branches.find(b => b.id === specificBranchId);
    if (!branch) {
      return { success: false, status: 'NOT_FOUND', error: `Branch not found` };
    }
    const wrapper = getSheetsClient();
    if (!wrapper) {
      return { success: false, status: 'AUTH_REQUIRED', error: 'Authentication required' };
    }
    const res = await fetchBranchStudents(branch, wrapper);
    return {
      success: res.status === 'CONNECTED',
      status: res.status,
      count: res.count || 0,
      sheetTitle: res.sheetTitle,
      error: res.error || null,
      message: res.status === 'CONNECTED' ? `Synced ${res.count} students` : res.error
    };
  }

  try {
    const result = await fetchStudentsFromSheet();
    return {
      success: result.status === 'CONNECTED',
      source: result.source,
      status: result.status,
      count: result.students.length,
      totalBranches: result.totalBranches || 0,
      connectedBranches: result.connectedBranches || 0,
      branchesReport: result.branchesReport || [],
      authType: result.authType || 'Local',
      message: result.message || result.warning
    };
  } catch (err) {
    return {
      success: false,
      status: 'ERROR',
      error: err.message
    };
  }
}

module.exports = {
  fetchStudentsFromSheet,
  fetchBranchStudents,
  testGoogleSheetsConnection,
  identifyColumnsFromRows,
  getSheetsClient,
  identifyColumns: (headerRow) => {
    const res = identifyColumnsFromRows([headerRow]);
    return {
      nameIdx: res.nameIdx,
      dobIdx: res.dobIdx,
      phoneIdx: res.phoneIdx,
      branchIdx: res.branchIdx
    };
  }
};
