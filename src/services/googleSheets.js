const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const config = require('../config/env');
const settings = require('./settings');

/**
 * Normalizes header strings for flexible column matching.
 */
function normalizeHeader(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Maps dynamic column indexes based on header names.
 */
function identifyColumns(headerRow) {
  const mapping = {
    nameIdx: -1,
    dobIdx: -1,
    phoneIdx: -1,
    branchIdx: -1
  };

  headerRow.forEach((col, idx) => {
    const norm = normalizeHeader(col);

    // Name column matching
    if (mapping.nameIdx === -1 && (norm.includes('studentname') || norm === 'name' || norm.includes('fullname') || norm.includes('applicant'))) {
      mapping.nameIdx = idx;
    }

    // DOB column matching
    if (mapping.dobIdx === -1 && (norm.includes('dateofbirth') || norm.includes('dob') || norm.includes('birthdate') || norm.includes('bday'))) {
      mapping.dobIdx = idx;
    }

    // Phone / WhatsApp column matching
    if (mapping.phoneIdx === -1 && (norm.includes('whatsapp') || norm.includes('phone') || norm.includes('contact') || norm.includes('mobile') || norm.includes('tel'))) {
      mapping.phoneIdx = idx;
    }

    // Branch / Location column matching
    if (mapping.branchIdx === -1 && (norm.includes('branch') || norm.includes('location') || norm.includes('center') || norm.includes('campus'))) {
      mapping.branchIdx = idx;
    }
  });

  return mapping;
}

/**
 * Helper to fetch and parse CSV text into student objects.
 */
function parseCsvContent(rawCsv, sourceLabel) {
  const lines = rawCsv.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) return [];

  const header = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const mapping = identifyColumns(header);

  const students = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (!row.length) continue;

    const name = mapping.nameIdx !== -1 ? row[mapping.nameIdx] : row[0] || '';
    const dob = mapping.dobIdx !== -1 ? row[mapping.dobIdx] : row[1] || '';
    const phone = mapping.phoneIdx !== -1 ? row[mapping.phoneIdx] : row[2] || '';
    const branch = mapping.branchIdx !== -1 ? row[mapping.branchIdx] : row[3] || 'College';

    if (name || phone) {
      students.push({
        id: `${sourceLabel}_row_${i}`,
        name,
        dob,
        phone,
        branch
      });
    }
  }

  return students;
}

/**
 * Attempts to fetch sheet data via Google's CSV export endpoint (works when sheet is shared via link).
 */
async function fetchViaPublicCsvExport(spreadsheetId, gid = '0') {
  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  console.log(`[GoogleSheets] Attempting direct link CSV export: ${exportUrl}`);

  const response = await fetch(exportUrl, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Public CSV export returned status ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error('Sheet is private and requires Google Service Account authentication.');
  }

  const csvText = await response.text();
  const students = parseCsvContent(csvText, 'public_sheet');
  return students;
}
function loadFallbackCsv() {
  if (!fs.existsSync(config.SAMPLE_CSV_PATH)) {
    throw new Error(`Fallback sample CSV file not found at ${config.SAMPLE_CSV_PATH}`);
  }

  const rawCsv = fs.readFileSync(config.SAMPLE_CSV_PATH, 'utf8');
  const lines = rawCsv.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) return [];

  // Parse header
  const header = lines[0].split(',').map(h => h.trim());
  const mapping = identifyColumns(header);

  const students = [];
  for (let i = 1; i < lines.length; i++) {
    // Simple CSV splitter handling quoted values
    const row = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (!row.length) continue;

    const name = mapping.nameIdx !== -1 ? row[mapping.nameIdx] : row[0] || '';
    const dob = mapping.dobIdx !== -1 ? row[mapping.dobIdx] : row[1] || '';
    const phone = mapping.phoneIdx !== -1 ? row[mapping.phoneIdx] : row[2] || '';
    const branch = mapping.branchIdx !== -1 ? row[mapping.branchIdx] : row[3] || 'College';

    if (name || phone) {
      students.push({
        id: `csv_row_${i}`,
        name,
        dob,
        phone,
        branch
      });
    }
  }

  return students;
}

/**
 * Fetches student records from Google Sheets, falling back to local CSV if credentials are not yet supplied.
 */
async function fetchStudentsFromSheet() {
  const currentSettings = settings.loadSettings();
  const credsPath = config.GOOGLE_CREDENTIALS_PATH;
  const hasCreds = fs.existsSync(credsPath);
  const spreadsheetId = currentSettings.spreadsheetId || config.SPREADSHEET_ID;
  const targetSheet = currentSettings.sheetName || config.SHEET_NAME || 'INQUIRY DETAILS 2026/27';
  const hasSpreadsheetId = Boolean(spreadsheetId && spreadsheetId !== 'your_google_spreadsheet_id_here');

  // Check if we should use Google Sheets API
  if (hasCreds && hasSpreadsheetId) {
    try {
      console.log(`[GoogleSheets] Authenticating with service account: ${credsPath}`);
      const auth = new google.auth.GoogleAuth({
        keyFile: credsPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
      });

      const sheets = google.sheets({ version: 'v4', auth });
      const range = `${targetSheet}!A1:Z`;

      console.log(`[GoogleSheets] Fetching data from sheet: "${targetSheet}" (Spreadsheet ID: ${spreadsheetId})`);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return {
          source: 'GOOGLE_SHEETS',
          sheetName: targetSheet,
          status: 'CONNECTED_EMPTY',
          students: [],
          message: 'Sheet connected successfully, but no rows were found.'
        };
      }

      const header = rows[0];
      const mapping = identifyColumns(header);
      const dataRows = rows.slice(1);

      const students = [];
      dataRows.forEach((row, index) => {
        const name = mapping.nameIdx !== -1 ? (row[mapping.nameIdx] || '') : (row[0] || '');
        const dob = mapping.dobIdx !== -1 ? (row[mapping.dobIdx] || '') : (row[1] || '');
        const phone = mapping.phoneIdx !== -1 ? (row[mapping.phoneIdx] || '') : (row[2] || '');
        const branch = mapping.branchIdx !== -1 ? (row[mapping.branchIdx] || '') : (row[3] || 'College');

        if (name.trim() || phone.trim()) {
          students.push({
            id: `sheet_row_${index + 2}`,
            name: name.trim(),
            dob: dob.trim(),
            phone: phone.trim(),
            branch: branch.trim() || 'College'
          });
        }
      });

      console.log(`[GoogleSheets] Successfully fetched ${students.length} students from Google Sheet.`);
      return {
        source: 'GOOGLE_SHEETS',
        sheetName: targetSheet,
        status: 'CONNECTED',
        students,
        message: `Synced ${students.length} students from Google Sheets tab: "${targetSheet}"`
      };
    } catch (err) {
      console.error('[GoogleSheets] Error connecting to Google Sheets API:', err.message);
      if (config.DATA_SOURCE_FALLBACK) {
        console.warn('[GoogleSheets] Falling back to local sample CSV due to API error.');
        const fallbackStudents = loadFallbackCsv();
        return {
          source: 'LOCAL_FALLBACK_CSV',
          sheetName: config.SHEET_NAME,
          status: 'FALLBACK_ON_ERROR',
          students: fallbackStudents,
          warning: `Google Sheets error (${err.message}). Using local sample data (${fallbackStudents.length} records).`
        };
      }
      throw err;
    }
  }

  // Fallback mode: Attempt public CSV export if spreadsheet ID is provided
  if (hasSpreadsheetId) {
    try {
      const gid = currentSettings.sheetGid || '350995715';
      const publicStudents = await fetchViaPublicCsvExport(spreadsheetId, gid);
      if (publicStudents && publicStudents.length > 0) {
        console.log(`[GoogleSheets] Successfully synced ${publicStudents.length} rows via direct link export.`);
        return {
          source: 'GOOGLE_SHEETS_DIRECT',
          sheetName: targetSheet,
          status: 'CONNECTED',
          students: publicStudents,
          message: `Synced ${publicStudents.length} students directly from Google Sheet.`
        };
      }
    } catch (publicErr) {
      console.log(`[GoogleSheets] Direct link export note: ${publicErr.message}`);
    }
  }

  // Fallback mode if credentials or sheet ID not configured yet
  if (config.DATA_SOURCE_FALLBACK) {
    const reason = !hasCreds 
      ? 'Private sheet (requires Google Service Account credentials.json or link sharing)' 
      : 'Google Sheet Link or ID not set';
    console.log(`[GoogleSheets] ${reason}. Using local sample data (data/sample_students.csv).`);
    const fallbackStudents = loadFallbackCsv();
    return {
      source: 'LOCAL_FALLBACK_CSV',
      sheetName: targetSheet || 'data/sample_students.csv',
      status: 'FALLBACK_DEMO',
      students: fallbackStudents,
      warning: `${reason}. Loaded ${fallbackStudents.length} demo records from local sample CSV.`
    };
  }

  throw new Error('Google Sheets credentials or SPREADSHEET_ID missing, and fallback is disabled.');
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
  identifyColumns
};

