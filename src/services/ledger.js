const fs = require('fs');
const path = require('path');
const config = require('../config/env');

const LEDGER_PATH = config.SENT_LOG_PATH;

/**
 * Reads the ledger from disk safely.
 * Returns an object with records keyed by `${phone}_${year}` and an items array.
 */
function readLedger() {
  try {
    if (!fs.existsSync(LEDGER_PATH)) {
      const initial = { records: {}, updatedAt: new Date().toISOString() };
      fs.writeFileSync(LEDGER_PATH, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(LEDGER_PATH, 'utf8');
    const data = JSON.parse(raw);
    if (!data.records) {
      data.records = {};
    }
    return data;
  } catch (err) {
    console.error('[Ledger] Failed to read ledger file, initializing fresh:', err.message);
    return { records: {}, updatedAt: new Date().toISOString() };
  }
}

/**
 * Writes the ledger data to disk safely.
 */
function saveLedger(data) {
  try {
    data.updatedAt = new Date().toISOString();
    const tempPath = `${LEDGER_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, LEDGER_PATH);
    return true;
  } catch (err) {
    console.error('[Ledger] Failed to save ledger:', err.message);
    try {
      fs.writeFileSync(LEDGER_PATH, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (innerErr) {
      console.error('[Ledger] Critical fallback save error:', innerErr.message);
      return false;
    }
  }
}

/**
 * Generates the unique deduplication key for a student wish.
 */
function getRecordKey(phone, year) {
  return `${phone}_${year}`;
}

/**
 * Checks if a birthday wish has already been sent to this phone in the given year.
 */
function hasBeenSentThisYear(phone, year) {
  if (!phone || !year) return false;
  const ledger = readLedger();
  const key = getRecordKey(phone, year);
  return Boolean(ledger.records[key] && ledger.records[key].status === 'SENT');
}

/**
 * Records a successful birthday wish in the ledger.
 */
function recordSent({ phone, name, year, date, message = '', method = 'whatsapp-web.js' }) {
  if (!phone || !year) {
    throw new Error('phone and year are required to record in sent_log');
  }

  const ledger = readLedger();
  const key = getRecordKey(phone, year);

  ledger.records[key] = {
    key,
    phone,
    name,
    year: Number(year),
    dateSent: date || new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    status: 'SENT',
    method,
    messagePreview: message.length > 80 ? message.substring(0, 80) + '...' : message
  };

  saveLedger(ledger);
  console.log(`[Ledger] Recorded birthday wish for ${name} (${phone}) - Year: ${year}`);
  return ledger.records[key];
}

/**
 * Removes a specific sent record by phone and year so it returns to pending status.
 */
function clearSentRecord(phone, year) {
  if (!phone || !year) return false;
  const ledger = readLedger();
  const key = getRecordKey(phone, year);
  if (!ledger.records[key]) {
    return false;
  }
  delete ledger.records[key];
  saveLedger(ledger);
  console.log(`[Ledger] Cleared sent record for ${phone} - Year: ${year}`);
  return true;
}

/**
 * Gets all sent records as an array, sorted newest first.
 */
function getAllSentRecords() {
  const ledger = readLedger();
  return Object.values(ledger.records).sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );
}

module.exports = {
  readLedger,
  getRecordKey,
  hasBeenSentThisYear,
  recordSent,
  clearSentRecord,
  getAllSentRecords
};

