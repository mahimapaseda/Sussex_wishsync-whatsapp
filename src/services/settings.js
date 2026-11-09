const fs = require('fs');
const path = require('path');
const config = require('../config/env');

const SETTINGS_PATH = path.join(config.DATA_DIR, 'settings.json');

/**
 * Extracts Google Spreadsheet ID from a full Google Sheets URL or returns the raw ID.
 * Examples:
 * https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
 * -> 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
 */
function extractSpreadsheetId(input) {
  if (!input) return '';
  const trimmed = String(input).trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * Extracts sheet tab GID from URL if present.
 */
function extractSheetGid(input) {
  if (!input) return null;
  const match = String(input).trim().match(/[?&#]gid=([0-9]+)/);
  return match && match[1] ? match[1] : null;
}

const DEFAULT_SETTINGS = {
  template: config.DEFAULT_TEMPLATE,
  autoSendOnBoot: config.AUTO_SEND_ON_BOOT,
  autoSendDelaySeconds: config.AUTO_SEND_DELAY_SECONDS,
  minDispatchDelayMs: config.MIN_DISPATCH_DELAY_MS,
  maxDispatchDelayMs: config.MAX_DISPATCH_DELAY_MS,
  spreadsheetUrl: config.SPREADSHEET_ID ? `https://docs.google.com/spreadsheets/d/${config.SPREADSHEET_ID}/edit` : '',
  spreadsheetId: config.SPREADSHEET_ID || '',
  sheetName: config.SHEET_NAME || 'INQUIRY DETAILS 2026/27',
  credentialsConfigured: fs.existsSync(config.GOOGLE_CREDENTIALS_PATH),
  updatedAt: new Date().toISOString()
};

/**
 * Loads persistent settings from disk.
 */
function loadSettings() {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) {
      fs.writeFileSync(SETTINGS_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf8');
      return { ...DEFAULT_SETTINGS };
    }
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    const combined = { ...DEFAULT_SETTINGS, ...parsed };

    // Keep spreadsheetId normalized
    if (combined.spreadsheetUrl && !combined.spreadsheetId) {
      combined.spreadsheetId = extractSpreadsheetId(combined.spreadsheetUrl);
    }
    combined.credentialsConfigured = fs.existsSync(config.GOOGLE_CREDENTIALS_PATH);

    // If credentials file exists, try to extract service account client_email
    if (combined.credentialsConfigured && !combined.serviceAccountEmail) {
      try {
        const credsRaw = fs.readFileSync(config.GOOGLE_CREDENTIALS_PATH, 'utf8');
        const c = JSON.parse(credsRaw);
        combined.serviceAccountEmail = c.client_email || 'Service Account';
      } catch (e) {}
    }

    return combined;
  } catch (err) {
    console.error('[Settings] Error loading settings, using defaults:', err.message);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Updates settings and saves to disk.
 */
function updateSettings(newSettings) {
  try {
    const current = loadSettings();
    const updated = {
      ...current,
      ...newSettings
    };

    // Auto-extract ID if spreadsheetUrl changed
    if (newSettings.spreadsheetUrl !== undefined) {
      updated.spreadsheetUrl = newSettings.spreadsheetUrl.trim();
      updated.spreadsheetId = extractSpreadsheetId(updated.spreadsheetUrl);
      updated.sheetGid = extractSheetGid(updated.spreadsheetUrl);
    } else if (newSettings.spreadsheetId !== undefined) {
      updated.spreadsheetId = newSettings.spreadsheetId.trim();
    }

    if (newSettings.sheetName !== undefined) {
      updated.sheetName = newSettings.sheetName.trim() || 'INQUIRY DETAILS 2026/27';
    }

    // If credentials JSON content was pasted
    if (newSettings.credentialsJsonContent && newSettings.credentialsJsonContent.trim()) {
      try {
        const parsedCreds = JSON.parse(newSettings.credentialsJsonContent.trim());
        fs.writeFileSync(config.GOOGLE_CREDENTIALS_PATH, JSON.stringify(parsedCreds, null, 2), 'utf8');
        updated.credentialsConfigured = true;
        updated.serviceAccountEmail = parsedCreds.client_email || 'Service Account';
        console.log('[Settings] Saved new credentials.json from UI settings.');
      } catch (e) {
        throw new Error(`Invalid JSON format for Google Service Account credentials: ${e.message}`);
      }
    }

    updated.updatedAt = new Date().toISOString();
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(updated, null, 2), 'utf8');
    console.log('[Settings] Updated persistent settings on disk.');
    return updated;
  } catch (err) {
    console.error('[Settings] Failed to save settings to disk:', err.message);
    throw err;
  }
}

module.exports = {
  loadSettings,
  updateSettings,
  extractSpreadsheetId,
  extractSheetGid
};
