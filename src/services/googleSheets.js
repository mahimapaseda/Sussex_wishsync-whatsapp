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
 * Identifies column mapping across rows (supports both standard row-1 headers and row-3/4 sub-headers).
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

  // Scan for best header row
  for (let r = 0; r < maxScanRows; r++) {
    const row = rows[r] || [];
    let curNameIdx = -1;
    let curPhoneIdx = -1;
    let curBranchIdx = -1;
    let curDobIdx = -1;
    let curDayIdx = -1;
    let curMonthIdx = -1;
    let curYearIdx = -1;

    row.forEach((col, idx) => {
      const norm = normalizeHeader(col);

      if (curNameIdx === -1 && (norm.includes('nameofstudent') || norm === 'studentname' || norm === 'name' || norm.includes('fullname'))) {
        curNameIdx = idx;
      }
      if (curPhoneIdx === -1 && (norm.includes('contactno') || norm.includes('whatsapp') || norm.includes('phone') || norm.includes('mobile') || norm.includes('tel'))) {
        curPhoneIdx = idx;
      }
      if (curBranchIdx === -1 && (norm === 'source' || norm.includes('branch') || norm.includes('location') || norm.includes('center') || norm.includes('campus'))) {
        curBranchIdx = idx;
      }
      if (curDobIdx === -1 && (norm.includes('dateofbirth') || norm === 'dob' || norm.includes('birthdate') || norm.includes('bday'))) {
        curDobIdx = idx;
      }
      if (curDayIdx === -1 && norm === 'date' && idx >= 4) {
        curDayIdx = idx;
      }
      if (curMonthIdx === -1 && norm === 'month') {
        curMonthIdx = idx;
      }
      if (curYearIdx === -1 && norm === 'year') {
        curYearIdx = idx;
      }
    });

    // If both name and phone are found in this row, this is our main sub-header!
    if (curNameIdx !== -1 && curPhoneIdx !== -1) {
      mapping.headerRowIdx = r;
      mapping.nameIdx = curNameIdx;
      mapping.phoneIdx = curPhoneIdx;
      mapping.branchIdx = curBranchIdx;
      mapping.dobIdx = curDobIdx;
      mapping.dayIdx = curDayIdx;
      mapping.monthIdx = curMonthIdx;
      mapping.yearIdx = curYearIdx;
      return mapping;
    }
  }

  // Fallback: standard row 0 matching
  if (rows.length > 0) {
    const row0 = rows[0] || [];
    row0.forEach((col, idx) => {
      const norm = normalizeHeader(col);
      if (mapping.nameIdx === -1 && (norm.includes('name') || norm.includes('student'))) mapping.nameIdx = idx;
      if (mapping.dobIdx === -1 && (norm.includes('dob') || norm.includes('birth'))) mapping.dobIdx = idx;
      if (mapping.phoneIdx === -1 && (norm.includes('phone') || norm.includes('whatsapp') || norm.includes('contact'))) mapping.phoneIdx = idx;
      if (mapping.branchIdx === -1 && (norm.includes('branch') || norm.includes('source') || norm.includes('location'))) mapping.branchIdx = idx;
    });
  }

  return mapping;
}

/**
 * Helper to parse CSV text into student objects.
 */
function parseCsvContent(rawCsv, sourceLabel) {
  const lines = rawCsv.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) return [];

  const rows = lines.map(l => l.split(',').map(c => c.trim().replace(/^["']|["']$/g, '')));
  const mapping = identifyColumnsFromRows(rows);

  const students = [];
  for (let i = mapping.headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row.length) continue;

    let name = mapping.nameIdx !== -1 ? (row[mapping.nameIdx] || '') : (row[0] || '');
    let phone = mapping.phoneIdx !== -1 ? (row[mapping.phoneIdx] || '') : (row[2] || '');
    let branch = mapping.branchIdx !== -1 ? (row[mapping.branchIdx] || 'College') : 'College';

    let dob = '';
    if (mapping.dayIdx !== -1 && mapping.monthIdx !== -1 && row[mapping.dayIdx] && row[mapping.monthIdx]) {
      const d = String(row[mapping.dayIdx]).trim();
      const m = String(row[mapping.monthIdx]).trim();
      const y = mapping.yearIdx !== -1 && row[mapping.yearIdx] ? String(row[mapping.yearIdx]).trim() : '2020';
      dob = `${d}/${m}/${y}`;
    } else if (mapping.dobIdx !== -1) {
      dob = row[mapping.dobIdx] || '';
    }

    if (phone.includes('/')) {
      phone = phone.split('/')[0].trim();
    }

    if (name || phone || dob) {
      students.push({
        id: `${sourceLabel}_row_${i + 1}`,
        name: name || `Inquirer (${phone || 'Student'})`,
        dob,
        phone,
        branch: branch || 'College'
      });
    }
  }

  return students;
}

/**
 * Reads and parses fallback sample CSV data.
 */
function loadFallbackCsv() {
  if (!fs.existsSync(config.SAMPLE_CSV_PATH)) {
    throw new Error(`Fallback sample CSV file not found at ${config.SAMPLE_CSV_PATH}`);
  }
  const rawCsv = fs.readFileSync(config.SAMPLE_CSV_PATH, 'utf8');
  return parseCsvContent(rawCsv, 'sample');
}

/**
 * Fetches student records from Google Sheets, falling back to local CSV if credentials are not yet supplied.
 */
async function fetchStudentsFromSheet() {
  const currentSettings = settings.loadSettings();
  const credsPath = config.GOOGLE_CREDENTIALS_PATH;
  const hasCreds = fs.existsSync(credsPath);
  const spreadsheetId = currentSettings.spreadsheetId || config.SPREADSHEET_ID;
  const requestedSheet = currentSettings.sheetName || config.SHEET_NAME || 'INQUIRY DETAILS 2026/27';
  const hasSpreadsheetId = Boolean(spreadsheetId && spreadsheetId !== 'your_google_spreadsheet_id_here');

  // Check 1: Google OAuth2 (Sign In with Google)
  const oauthSheets = googleAuth.getAuthenticatedSheetsClient();
  const oauthStatus = googleAuth.getAuthStatus();

  let sheetsClient = null;
  let authType = null;

  if (oauthSheets && oauthStatus.signedIn) {
    sheetsClient = oauthSheets;
    authType = `OAuth2 (${oauthStatus.userEmail})`;
    console.log(`[GoogleSheets] Authenticating via User Google Account: ${oauthStatus.userEmail}`);
  } else if (hasCreds && hasSpreadsheetId) {
    // Check 2: Service Account (credentials.json)
    try {
      console.log(`[GoogleSheets] Authenticating with service account: ${credsPath}`);
      const auth = new google.auth.GoogleAuth({
        keyFile: credsPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
      });
      sheetsClient = google.sheets({ version: 'v4', auth });
      authType = 'Service Account';
    } catch (e) {
      console.warn('[GoogleSheets] Service account init failed:', e.message);
    }
  }

  // If we have an authenticated Google Sheets client (either OAuth or Service Account)
  if (sheetsClient && hasSpreadsheetId) {
    try {
      const sheets = sheetsClient;

      // 1. Fetch metadata to resolve exact sheet tab title dynamically (handles slashes/spaces)
      const meta = await sheets.spreadsheets.get({ spreadsheetId });
      const normRequested = normalizeHeader(requestedSheet);

      let matchedSheet = meta.data.sheets.find(s => {
        const normTitle = normalizeHeader(s.properties.title);
        return normTitle === normRequested;
      });

      // If exact match not found, find first sheet containing inquiry or default to first tab
      if (!matchedSheet) {
        matchedSheet = meta.data.sheets.find(s => normalizeHeader(s.properties.title).includes('inquiry')) || meta.data.sheets[0];
      }

      const exactTitle = matchedSheet.properties.title;
      console.log(`[GoogleSheets] Resolved Sheet Tab Title: "${exactTitle}" (Requested: "${requestedSheet}") via ${authType}`);

      // 2. Fetch all values using properly quoted sheet range: `'<Title>'!A1:Z`
      const range = `'${exactTitle}'!A1:Z`;
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return {
          source: 'GOOGLE_SHEETS',
          sheetName: exactTitle,
          status: 'CONNECTED_EMPTY',
          students: [],
          authType,
          message: `Sheet tab "${exactTitle}" connected successfully via ${authType}, but no rows were found.`
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
        let branch = mapping.branchIdx !== -1 ? (row[mapping.branchIdx] || 'College').trim() : 'College';

        // Check split Date/Month/Year vs single DOB column
        let dob = '';
        if (mapping.dayIdx !== -1 && mapping.monthIdx !== -1 && row[mapping.dayIdx] && row[mapping.monthIdx]) {
          const d = String(row[mapping.dayIdx]).trim();
          const m = String(row[mapping.monthIdx]).trim();
          const y = mapping.yearIdx !== -1 && row[mapping.yearIdx] ? String(row[mapping.yearIdx]).trim() : '2020';
          dob = `${d}/${m}/${y}`;
        } else if (mapping.dobIdx !== -1 && row[mapping.dobIdx]) {
          dob = String(row[mapping.dobIdx]).trim();
        }

        // Clean phone numbers containing slashes or secondary contact
        if (phone.includes('/')) {
          phone = phone.split('/')[0].trim();
        }

        if (name || phone || dob) {
          students.push({
            id: `sheet_row_${mapping.headerRowIdx + index + 2}`,
            name: name || `Inquirer (${phone || 'Student'})`,
            dob,
            phone,
            branch: branch || 'College'
          });
        }
      });

      console.log(`[GoogleSheets] Successfully synced ${students.length} students from Google Sheet "${exactTitle}" (${authType}).`);
      return {
        source: 'GOOGLE_SHEETS',
        sheetName: exactTitle,
        status: 'CONNECTED',
        authType,
        students,
        message: `Synced ${students.length} students from Google Sheets tab "${exactTitle}" (${authType}).`
      };
    } catch (err) {
      console.error(`[GoogleSheets] Error connecting to Google Sheets API (${authType}):`, err.message);
      return {
        source: 'GOOGLE_SHEETS',
        sheetName: requestedSheet,
        status: 'ERROR',
        students: [],
        warning: `Google Sheets error: ${err.message}`
      };
    }
  }

  // If no spreadsheet ID or URL has been configured yet
  return {
    source: 'GOOGLE_SHEETS',
    sheetName: requestedSheet || 'None',
    status: 'NOT_CONFIGURED',
    students: [],
    warning: 'Please add your Google Sheet URL and Tab Name in Settings.'
  };
}

/**
 * Validates Google Sheets connection health.
 */
async function testGoogleSheetsConnection() {
  try {
    const result = await fetchStudentsFromSheet();
    return {
      success: true,
      source: result.source,
      status: result.status,
      count: result.students.length,
      sheetName: result.sheetName,
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
  testGoogleSheetsConnection,
  identifyColumnsFromRows,
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
