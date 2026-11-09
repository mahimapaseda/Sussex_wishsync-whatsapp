const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const ROOT_DIR = path.resolve(__dirname, '../../');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const SENT_LOG_PATH = path.join(DATA_DIR, 'sent_log.json');
const SAMPLE_CSV_PATH = path.join(DATA_DIR, 'sample_students.csv');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

module.exports = {
  ROOT_DIR,
  DATA_DIR,
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

