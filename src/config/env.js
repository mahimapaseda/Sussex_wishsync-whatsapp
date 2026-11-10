const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const ROOT_DIR = path.resolve(__dirname, '../../');

// In packaged electron mode, user data must be written to %APPDATA%/SheetPulse
function resolveDataDir() {
  if (process.env.APPDATA) {
    const appDataSheetPulse = path.join(process.env.APPDATA, 'SheetPulse');
    if (!fs.existsSync(appDataSheetPulse)) {
      try {
        fs.mkdirSync(appDataSheetPulse, { recursive: true });
      } catch (e) {
        // Fallback to local data folder
      }
    }
    return appDataSheetPulse;
  }
  return path.join(ROOT_DIR, 'data');
}

const DATA_DIR = resolveDataDir();
const LOCAL_DATA_DIR = path.join(ROOT_DIR, 'data');

// Migrate existing local data files (settings.json, sent_log.json, tokens, assets) on first run
function migrateLocalData() {
  if (DATA_DIR === LOCAL_DATA_DIR) return;
  try {
    const filesToMigrate = ['settings.json', 'sent_log.json', 'google_token.json', 'credentials.json'];
    for (const f of filesToMigrate) {
      const src = path.join(LOCAL_DATA_DIR, f);
      const dst = path.join(DATA_DIR, f);
      if (fs.existsSync(src) && !fs.existsSync(dst)) {
        fs.copyFileSync(src, dst);
      }
    }

    const srcAssets = path.join(LOCAL_DATA_DIR, 'assets');
    const dstAssets = path.join(DATA_DIR, 'assets');
    if (fs.existsSync(srcAssets) && !fs.existsSync(dstAssets)) {
      fs.cpSync(srcAssets, dstAssets, { recursive: true });
    }
  } catch (err) {
    console.warn('[Storage] Migration note:', err.message);
  }
}

migrateLocalData();

// Ensure asset folder exists
const ASSETS_DIR = path.join(DATA_DIR, 'assets');
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

const SENT_LOG_PATH = path.join(DATA_DIR, 'sent_log.json');
const SAMPLE_CSV_PATH = path.join(LOCAL_DATA_DIR, 'sample_students.csv');

module.exports = {
  ROOT_DIR,
  DATA_DIR,
  ASSETS_DIR,
  SENT_LOG_PATH,
  SAMPLE_CSV_PATH,
  PORT: parseInt(process.env.PORT, 10) || 3847,
  TIMEZONE: process.env.TIMEZONE || 'Asia/Colombo',
  OPEN_BROWSER_ON_BOOT: process.env.OPEN_BROWSER_ON_BOOT !== 'false',
  SPREADSHEET_ID: process.env.SPREADSHEET_ID || '',
  SHEET_NAME: process.env.SHEET_NAME || 'INQUIRY DETAILS 2026/27',
  GOOGLE_CREDENTIALS_PATH: path.resolve(ROOT_DIR, process.env.GOOGLE_CREDENTIALS_PATH || 'credentials.json'),
  DATA_SOURCE_FALLBACK: process.env.DATA_SOURCE_FALLBACK === 'true',
  WHATSAPP_CLIENT_ID: process.env.WHATSAPP_CLIENT_ID || 'sheetpulse-session',
  AUTO_SEND_ON_BOOT: process.env.AUTO_SEND_ON_BOOT === 'true',
  AUTO_SEND_DELAY_SECONDS: parseInt(process.env.AUTO_SEND_DELAY_SECONDS, 10) || 10,
  MIN_DISPATCH_DELAY_MS: parseInt(process.env.MIN_DISPATCH_DELAY_MS, 10) || 5000,
  MAX_DISPATCH_DELAY_MS: parseInt(process.env.MAX_DISPATCH_DELAY_MS, 10) || 12000,
  DEFAULT_TEMPLATE: process.env.DEFAULT_TEMPLATE || 'Dear {name}, on behalf of Sussex, we wish you a very Happy Birthday! 🎂🎉 May this special day bring you immense joy, happiness, and great success ahead!'
};
