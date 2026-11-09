const fs = require('fs');
const path = require('path');
const config = require('../config/env');

const SETTINGS_PATH = path.join(config.DATA_DIR, 'settings.json');

/**
 * Extracts Google Spreadsheet ID from a full Google Sheets URL or returns the raw ID.
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
  branches: [],
  credentialsConfigured: fs.existsSync(config.GOOGLE_CREDENTIALS_PATH),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleUserEmail: null,
  googleAuthConnected: false,
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

    if (!Array.isArray(combined.branches)) {
      combined.branches = [];
    }

    combined.credentialsConfigured = fs.existsSync(config.GOOGLE_CREDENTIALS_PATH);

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

    if (newSettings.branches !== undefined && Array.isArray(newSettings.branches)) {
      updated.branches = newSettings.branches.map(b => ({
        id: b.id || 'branch_' + Math.random().toString(36).substring(2, 9),
        name: (b.name || 'Unnamed Branch').trim(),
        spreadsheetUrl: (b.spreadsheetUrl || '').trim(),
        spreadsheetId: extractSpreadsheetId(b.spreadsheetUrl || b.spreadsheetId),
        sheetName: (b.sheetName || 'INQUIRY DETAILS 2026/27').trim(),
        sheetGid: extractSheetGid(b.spreadsheetUrl) || b.sheetGid || null,
        enabled: b.enabled !== false,
        customTemplate: (b.customTemplate || '').trim()
      }));
    }

    if (newSettings.template !== undefined) {
      updated.template = newSettings.template.trim();
    }
    if (newSettings.autoSendOnBoot !== undefined) {
      updated.autoSendOnBoot = Boolean(newSettings.autoSendOnBoot);
    }
    if (newSettings.autoSendDelaySeconds !== undefined) {
      updated.autoSendDelaySeconds = parseInt(newSettings.autoSendDelaySeconds, 10) || 10;
    }
    if (newSettings.minDispatchDelayMs !== undefined) {
      updated.minDispatchDelayMs = parseInt(newSettings.minDispatchDelayMs, 10) || 5000;
    }
    if (newSettings.maxDispatchDelayMs !== undefined) {
      updated.maxDispatchDelayMs = parseInt(newSettings.maxDispatchDelayMs, 10) || 12000;
    }
    if (newSettings.googleClientId !== undefined) {
      updated.googleClientId = newSettings.googleClientId.trim();
    }
    if (newSettings.googleClientSecret !== undefined) {
      updated.googleClientSecret = newSettings.googleClientSecret.trim();
    }
    if (newSettings.googleUserEmail !== undefined) {
      updated.googleUserEmail = newSettings.googleUserEmail;
    }
    if (newSettings.googleAuthConnected !== undefined) {
      updated.googleAuthConnected = newSettings.googleAuthConnected;
    }

    if (newSettings.credentialsJsonContent && newSettings.credentialsJsonContent.trim()) {
      try {
        const parsedCreds = JSON.parse(newSettings.credentialsJsonContent.trim());
        fs.writeFileSync(config.GOOGLE_CREDENTIALS_PATH, JSON.stringify(parsedCreds, null, 2), 'utf8');
        updated.credentialsConfigured = true;
        updated.serviceAccountEmail = parsedCreds.client_email || 'Service Account';
      } catch (e) {
        throw new Error(`Invalid JSON format for Google Service Account credentials: ${e.message}`);
      }
    }

    updated.updatedAt = new Date().toISOString();
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(updated, null, 2), 'utf8');
    return updated;
  } catch (err) {
    console.error('[Settings] Failed to save settings to disk:', err.message);
    throw err;
  }
}

function getBranches() {
  const current = loadSettings();
  return current.branches || [];
}

function addBranch(branchData) {
  const current = loadSettings();
  const newBranch = {
    id: 'branch_' + Date.now(),
    name: (branchData.name || 'New Branch').trim(),
    spreadsheetUrl: (branchData.spreadsheetUrl || '').trim(),
    spreadsheetId: extractSpreadsheetId(branchData.spreadsheetUrl || branchData.spreadsheetId),
    sheetName: (branchData.sheetName || 'INQUIRY DETAILS 2026/27').trim(),
    sheetGid: extractSheetGid(branchData.spreadsheetUrl) || null,
    enabled: branchData.enabled !== false,
    customTemplate: (branchData.customTemplate || '').trim()
  };

  if (!newBranch.spreadsheetId) {
    throw new Error('A valid Google Sheet URL or Spreadsheet ID is required.');
  }

  current.branches.push(newBranch);
  updateSettings({ branches: current.branches });
  return newBranch;
}

function updateBranch(branchId, branchData) {
  const current = loadSettings();
  const index = current.branches.findIndex(b => b.id === branchId);
  if (index === -1) {
    throw new Error(`Branch with ID "${branchId}" not found.`);
  }

  const existing = current.branches[index];
  const updated = {
    ...existing,
    ...branchData,
    name: branchData.name ? branchData.name.trim() : existing.name,
    spreadsheetUrl: branchData.spreadsheetUrl !== undefined ? branchData.spreadsheetUrl.trim() : existing.spreadsheetUrl,
    spreadsheetId: branchData.spreadsheetUrl ? extractSpreadsheetId(branchData.spreadsheetUrl) : (branchData.spreadsheetId ? branchData.spreadsheetId.trim() : existing.spreadsheetId),
    sheetName: branchData.sheetName !== undefined ? branchData.sheetName.trim() : existing.sheetName,
    sheetGid: branchData.spreadsheetUrl ? (extractSheetGid(branchData.spreadsheetUrl) || existing.sheetGid) : existing.sheetGid,
    enabled: branchData.enabled !== undefined ? Boolean(branchData.enabled) : existing.enabled,
    customTemplate: branchData.customTemplate !== undefined ? branchData.customTemplate.trim() : existing.customTemplate
  };

  current.branches[index] = updated;
  updateSettings({ branches: current.branches });
  return updated;
}

function deleteBranch(branchId) {
  const current = loadSettings();
  const initialLength = current.branches.length;
  current.branches = current.branches.filter(b => b.id !== branchId);
  if (current.branches.length === initialLength) {
    throw new Error(`Branch with ID "${branchId}" not found.`);
  }
  updateSettings({ branches: current.branches });
  return { success: true, remaining: current.branches.length };
}

function toggleBranch(branchId, enabled) {
  return updateBranch(branchId, { enabled: Boolean(enabled) });
}

module.exports = {
  loadSettings,
  updateSettings,
  extractSpreadsheetId,
  extractSheetGid,
  getBranches,
  addBranch,
  updateBranch,
  deleteBranch,
  toggleBranch
};
