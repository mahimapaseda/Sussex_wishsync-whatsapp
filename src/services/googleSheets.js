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

function isNameHeader(norm) {
  if (!norm) return false;
  if (norm === 'branchname' || norm === 'schoolname' || norm === 'username') return false;
  return (
    norm.includes('nameofstudent') ||
    norm.includes('nameofthestudent') ||
    norm.includes('nameofchild') ||
    norm === 'studentname' ||
    norm === 'studentsname' ||
    norm === 'childname' ||
    norm === 'childsname' ||
    norm === 'inquirername' ||
    norm === 'applicantname' ||
    norm === 'student' ||
    norm === 'name' ||
    norm.includes('fullname') ||
    norm.includes('applicant')
  );
}

function isPhoneHeader(norm) {
  if (!norm) return false;
  return (
    norm.includes('whatsapp') ||
    norm.includes('contact') ||
    norm.includes('phone') ||
    norm.includes('mobile') ||
    norm === 'tel' ||
    norm.startsWith('tel') ||
    norm === 'tp' ||
    norm.endsWith('tp') ||
    norm === 'tno' ||
    norm.includes('guardianno') ||
    norm.includes('parentno')
  );
}

function isBranchHeader(norm) {
  if (!norm) return false;
  return (
    norm === 'source' ||
    norm.includes('branch') ||
    norm.includes('location') ||
    norm.includes('center') ||
    norm.includes('centre') ||
    norm.includes('campus')
  );
}

function isDobHeader(norm) {
  if (!norm) return false;
  return (
    norm.includes('dateofbirth') ||
    norm.includes('dateofbith') ||
    norm === 'dob' ||
    norm.startsWith('dob') ||
    norm.endsWith('dob') ||
    norm.includes('birthdate') ||
    norm.includes('birthday') ||
    norm.includes('bday') ||
    norm.includes('bdate') ||
    norm.includes('ddmmyy') ||
    norm.includes('ddmmyyyy') ||
    norm.includes('mmddyyyy')
  );
}

function isDaySubHeader(norm) {
  return norm === 'day' || norm === 'dd' || norm === 'date' || norm === 'bday';
}

function isMonthSubHeader(norm) {
  return norm === 'month' || norm === 'mm';
}

function isYearSubHeader(norm) {
  return norm === 'year' || norm === 'yyyy' || norm === 'yy';
}

/**
 * Identifies column mapping across rows (supports both standard row-1 headers and multi-row sub-headers).
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

  if (!Array.isArray(rows) || rows.length === 0) {
    return mapping;
  }

  const maxScanRows = Math.min(rows.length, 15);

  // 1. Score header rows to find the primary table header row (works even if headers sit below title banners or omit phone/name labels)
  let bestPrimaryRowIdx = 0;
  let bestScore = -1;

  for (let r = 0; r < maxScanRows; r++) {
    const row = rows[r] || [];
    let hasName = false;
    let hasPhone = false;
    let hasDob = false;
    let hasBranch = false;
    let hasDateParts = false;

    row.forEach(col => {
      const norm = normalizeHeader(col);
      if (isNameHeader(norm)) hasName = true;
      if (isPhoneHeader(norm)) hasPhone = true;
      if (isDobHeader(norm)) hasDob = true;
      if (isBranchHeader(norm)) hasBranch = true;
      if (isDaySubHeader(norm) || isMonthSubHeader(norm) || isYearSubHeader(norm)) hasDateParts = true;
    });

    const distinctSignals = [hasName, hasPhone, hasDob, hasBranch].filter(Boolean).length;
    const score = (hasName ? 3 : 0) + (hasPhone ? 3 : 0) + (hasDob ? 3 : 0) + (hasBranch ? 1 : 0) + (hasDateParts ? 1 : 0);

    if (distinctSignals >= 2 && score > bestScore) {
      bestScore = score;
      bestPrimaryRowIdx = r;
    }
  }

  // 2. Extend headerRowIdx if the immediate next row holds split sub-headers (e.g., Date | Month | Year or DD/MM/YYYY under Date of Birth)
  let headerEndRowIdx = bestPrimaryRowIdx;
  if (bestPrimaryRowIdx + 1 < rows.length) {
    const subRow = rows[bestPrimaryRowIdx + 1] || [];
    const subRowLooksLikeData = subRow.some(c => {
      const s = String(c || '').trim();
      return /\d{7,}/.test(s.replace(/\D/g, '')) || /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(s);
    });
    const hasSubHeaders = !subRowLooksLikeData && subRow.some(col => {
      const norm = normalizeHeader(col);
      return isDaySubHeader(norm) || isMonthSubHeader(norm) || isYearSubHeader(norm) || norm === 'ddmmyy' || norm === 'ddmmyyyy' || norm === 'mmddyyyy';
    });
    if (hasSubHeaders) {
      headerEndRowIdx = bestPrimaryRowIdx + 1;
    }
  }

  mapping.headerRowIdx = headerEndRowIdx;

  // 3. Scan header rows (0 through headerEndRowIdx) to populate primary columns and split-date candidates
  const dayCandidates = [];
  const monthCandidates = [];
  const yearCandidates = [];

  // Scan primary row first, then sub-header row, then any leading rows for merged top labels
  const scanOrder = [bestPrimaryRowIdx];
  for (let r = 0; r <= headerEndRowIdx; r++) {
    if (r !== bestPrimaryRowIdx) scanOrder.push(r);
  }

  for (const r of scanOrder) {
    const row = rows[r] || [];
    row.forEach((col, idx) => {
      const norm = normalizeHeader(col);
      if (!norm) return;

      if (mapping.nameIdx === -1 && isNameHeader(norm)) {
        mapping.nameIdx = idx;
      }
      if (mapping.phoneIdx === -1 && isPhoneHeader(norm)) {
        mapping.phoneIdx = idx;
      }
      if (mapping.branchIdx === -1 && isBranchHeader(norm)) {
        mapping.branchIdx = idx;
      }
      if (mapping.dobIdx === -1 && isDobHeader(norm)) {
        mapping.dobIdx = idx;
      }
      if (isDaySubHeader(norm)) {
        dayCandidates.push({ idx, norm, row: r });
      }
      if (isMonthSubHeader(norm)) {
        monthCandidates.push({ idx, norm, row: r });
      }
      if (isYearSubHeader(norm)) {
        yearCandidates.push({ idx, norm, row: r });
      }
    });
  }

  // Resolve split Day / Month / Year cluster without colliding with an unrelated Inquiry "Date" column
  if (monthCandidates.length > 0) {
    const pickedMonth = (mapping.dobIdx !== -1
      ? monthCandidates.find(c => c.idx >= mapping.dobIdx)
      : null) || monthCandidates[0];
    mapping.monthIdx = pickedMonth.idx;

    const nearDays = dayCandidates.filter(c =>
      Math.abs(c.idx - mapping.monthIdx) <= 3 ||
      c.norm === 'day' ||
      c.norm === 'dd' ||
      c.norm === 'bday' ||
      (mapping.dobIdx !== -1 && c.idx >= mapping.dobIdx)
    );
    if (nearDays.length > 0) {
      nearDays.sort((a, b) => Math.abs(a.idx - mapping.monthIdx) - Math.abs(b.idx - mapping.monthIdx));
      mapping.dayIdx = nearDays[0].idx;
    }

    const nearYears = yearCandidates.filter(c => Math.abs(c.idx - mapping.monthIdx) <= 3);
    if (nearYears.length > 0) {
      nearYears.sort((a, b) => Math.abs(a.idx - mapping.monthIdx) - Math.abs(b.idx - mapping.monthIdx));
      mapping.yearIdx = nearYears[0].idx;
    }
  }

  return mapping;
}

/**
 * Infers whether a sheet's combined DOB column uses MDY (MM/DD) vs DMY (DD/MM) when text dates appear.
 */
function inferColumnDateOrder(rows, startRowIdx, dobIdx) {
  if (dobIdx === -1 || !Array.isArray(rows)) return 'DMY';

  let dmyEvidence = 0;
  let mdyEvidence = 0;

  for (let r = startRowIdx; r < rows.length; r++) {
    const val = rows[r]?.[dobIdx];
    if (!val || typeof val === 'number') continue;
    const match = String(val).trim().match(/^(\d{1,2})\s*[-/.,]\s*(\d{1,2})(?:\s*[-/.,]\s*\d{2,5})?$/);
    if (!match) continue;
    const p1 = parseInt(match[1], 10);
    const p2 = parseInt(match[2], 10);
    if (p1 > 12) dmyEvidence++;
    if (p2 > 12) mdyEvidence++;
  }

  return (mdyEvidence > 0 && dmyEvidence === 0) ? 'MDY' : 'DMY';
}

function isValidSheetSerial(val) {
  return typeof val === 'number' && !isNaN(val) && Math.floor(val) >= 3653 && Math.floor(val) < 90000;
}

function looksLikeCombinedDateValue(formattedVal, unformattedVal) {
  if (isValidSheetSerial(unformattedVal)) return true;
  const s = String(formattedVal || '').trim();
  if (!s) return false;
  return /[-/.,]/.test(s) || /\b[a-zA-Z]{3,}\b/.test(s);
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

    // 2. Fetch all columns/rows across the entire matched tab (including columns past Z).
    // Fetch both formatted strings (phones/names/headers) and unformatted serial dates (unambiguous real Sheet Date cells).
    const escapedTitle = exactTitle.replace(/'/g, "''");
    const range = `'${escapedTitle}'`;
    const [formattedRes, unformattedRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range }),
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        valueRenderOption: 'UNFORMATTED_VALUE',
        dateTimeRenderOption: 'SERIAL_NUMBER'
      }).catch(() => null)
    ]);

    const rows = formattedRes?.data?.values || [];
    const unformattedRows = unformattedRes?.data?.values || null;
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

    // 3. Smart multi-row header mapping & column date-order inference
    const mapping = identifyColumnsFromRows(rows);
    const dataStartIdx = mapping.headerRowIdx + 1;
    const dataRows = rows.slice(dataStartIdx);
    const columnDateOrder = inferColumnDateOrder(rows, dataStartIdx, mapping.dobIdx);

    const students = [];
    dataRows.forEach((row, index) => {
      if (!row || !row.length) return;

      const unformattedRow = unformattedRows ? unformattedRows[dataStartIdx + index] : null;
      let name = mapping.nameIdx !== -1 ? String(row[mapping.nameIdx] || '').trim() : '';
      let phone = mapping.phoneIdx !== -1 ? String(row[mapping.phoneIdx] || '').trim() : '';
      let branchName = branch.name || (mapping.branchIdx !== -1 && row[mapping.branchIdx] ? String(row[mapping.branchIdx]).trim() : 'College');

      // Prefer unambiguous Sheets serial dates or complete combined DOB; fall back to split Day/Month/Year columns
      const formattedDob = mapping.dobIdx !== -1 ? row[mapping.dobIdx] : undefined;
      const unformattedDob = (mapping.dobIdx !== -1 && unformattedRow) ? unformattedRow[mapping.dobIdx] : undefined;
      const hasSplitDayMonth = mapping.dayIdx !== -1 && mapping.monthIdx !== -1 && row[mapping.dayIdx] && row[mapping.monthIdx];

      let dob = '';
      let dateOrderHint = columnDateOrder;

      if (hasSplitDayMonth && (mapping.dobIdx === -1 || mapping.dobIdx === mapping.dayIdx || !looksLikeCombinedDateValue(formattedDob, unformattedDob))) {
        const d = String(row[mapping.dayIdx]).trim();
        const m = String(row[mapping.monthIdx]).trim();
        const y = (mapping.yearIdx !== -1 && row[mapping.yearIdx]) ? String(row[mapping.yearIdx]).trim() : '';
        dob = y ? `${d}/${m}/${y}` : `${d}/${m}`;
        dateOrderHint = 'DMY';
      } else if (isValidSheetSerial(unformattedDob)) {
        dob = String(unformattedDob);
        dateOrderHint = 'DMY';
      } else if (formattedDob !== undefined && formattedDob !== null && String(formattedDob).trim() !== '') {
        dob = String(formattedDob).trim();
      } else if (hasSplitDayMonth) {
        const d = String(row[mapping.dayIdx]).trim();
        const m = String(row[mapping.monthIdx]).trim();
        const y = (mapping.yearIdx !== -1 && row[mapping.yearIdx]) ? String(row[mapping.yearIdx]).trim() : '';
        dob = y ? `${d}/${m}/${y}` : `${d}/${m}`;
        dateOrderHint = 'DMY';
      }

      if (phone.includes('/')) {
        phone = phone.split('/')[0].trim();
      }

      if (name || phone || dob) {
        students.push({
          id: `${branch.id}_row_${dataStartIdx + index + 1}`,
          name: name || `Inquirer (${phone || 'Student'})`,
          dob,
          dateOrderHint,
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
    const rawMsg = err?.response?.data?.error?.message || err.message || 'Unknown Google Sheets error';
    const statusCode = err?.code || err?.response?.status;
    let friendlyMsg = rawMsg;

    if (statusCode === 403 || /insufficient.*(permission|scope)|caller does not have permission/i.test(rawMsg)) {
      if (/scope|insufficient permission/i.test(rawMsg)) {
        friendlyMsg = `Insufficient Permission (${authType}): Check "See all your Google Spreadsheets" when signing in with Google, or ensure this sheet is shared with ${authType}.`;
      } else {
        friendlyMsg = `Permission denied for ${authType}: Please share this Google Sheet (Viewer access) with the signed-in Google account.`;
      }
    }

    console.error(`[GoogleSheets] Error fetching branch "${branch.name}":`, friendlyMsg);
    return {
      branchId: branch.id,
      branchName: branch.name,
      status: 'ERROR',
      students: [],
      error: friendlyMsg
    };
  }
}

let cachedSheetResult = null;
let lastFetchTime = 0;
let inflightFetchPromise = null;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes in-memory cache to prevent Google Sheets rate-limiting

/**
 * Clears cached Google Sheets response after branch or auth updates.
 */
function clearCache() {
  cachedSheetResult = null;
  lastFetchTime = 0;
}

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
  clearCache,
  identifyColumnsFromRows,
  inferColumnDateOrder,
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
