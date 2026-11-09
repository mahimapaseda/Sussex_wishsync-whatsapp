const assert = require('assert');
const path = require('path');
const fs = require('fs');
const matcher = require('../src/services/birthdayMatcher');
const ledger = require('../src/services/ledger');
const googleSheets = require('../src/services/googleSheets');
const config = require('../src/config/env');

const originalLedger = fs.existsSync(config.SENT_LOG_PATH) ? fs.readFileSync(config.SENT_LOG_PATH, 'utf8') : null;

console.log('--- Starting SheetPulse Test Suite ---');

// 1. Phone Sanitization Tests
console.log('\n[Test 1] Sri Lankan Phone Number Sanitization:');
{
  const p1 = matcher.sanitizePhoneNumber('0771234567');
  assert.strictEqual(p1.sanitized, '94771234567');
  assert.strictEqual(p1.isValid, true);
  console.log('  ✓ 0771234567 -> 94771234567 (Valid)');

  const p2 = matcher.sanitizePhoneNumber('+94 71 234 5678');
  assert.strictEqual(p2.sanitized, '94712345678');
  assert.strictEqual(p2.isValid, true);
  console.log('  ✓ +94 71 234 5678 -> 94712345678 (Valid)');

  const p3 = matcher.sanitizePhoneNumber('076-987-6543');
  assert.strictEqual(p3.sanitized, '94769876543');
  assert.strictEqual(p3.isValid, true);
  console.log('  ✓ 076-987-6543 -> 94769876543 (Valid)');

  const p4 = matcher.sanitizePhoneNumber('785551234');
  assert.strictEqual(p4.sanitized, '94785551234');
  assert.strictEqual(p4.isValid, true);
  console.log('  ✓ 785551234 -> 94785551234 (Valid)');

  const p5 = matcher.sanitizePhoneNumber('invalid');
  assert.strictEqual(p5.isValid, false);
  console.log('  ✓ invalid string flagged as invalid');
}

// 2. Date of Birth Parser Tests
console.log('\n[Test 2] Multi-format Date of Birth Parsing:');
{
  const d1 = matcher.parseDateOfBirth('09/11/2006');
  assert.strictEqual(d1.day, 9);
  assert.strictEqual(d1.month, 11);
  assert.strictEqual(d1.year, 2006);
  assert.strictEqual(d1.isValid, true);
  console.log('  ✓ 09/11/2006 (DD/MM/YYYY) -> Day: 9, Month: 11, Year: 2006');

  const d2 = matcher.parseDateOfBirth('1998-11-09');
  assert.strictEqual(d2.day, 9);
  assert.strictEqual(d2.month, 11);
  assert.strictEqual(d2.year, 1998);
  assert.strictEqual(d2.isValid, true);
  console.log('  ✓ 1998-11-09 (ISO YYYY-MM-DD) -> Day: 9, Month: 11, Year: 1998');

  const d3 = matcher.parseDateOfBirth('25-03-2002');
  assert.strictEqual(d3.day, 25);
  assert.strictEqual(d3.month, 3);
  assert.strictEqual(d3.year, 2002);
  assert.strictEqual(d3.isValid, true);
  console.log('  ✓ 25-03-2002 (DD-MM-YYYY) -> Day: 25, Month: 3, Year: 2002');
}

// 3. Message Template Formatter
console.log('\n[Test 3] Template Token Replacement:');
{
  const template = 'Hello {first_name} ({name}), from {branch}! You are turning {age}.';
  const student = { name: 'Kavindu Perera', branch: 'College', age: 20 };
  const formatted = matcher.formatMessage(template, student);
  assert.strictEqual(formatted, 'Hello Kavindu (Kavindu Perera), from College! You are turning 20.');
  console.log('  ✓ Formatted output:', formatted);
}

// 4. Ledger Deduplication Tests
console.log('\n[Test 4] Ledger & Deduplication:');
{
  const testPhone = `9477${Math.floor(1000000 + Math.random() * 9000000)}`;
  const testYear = 2026;

  // Ensure clean start for random test phone
  assert.strictEqual(ledger.hasBeenSentThisYear(testPhone, testYear), false);
  console.log(`  ✓ Initially hasBeenSentThisYear is false for test phone ${testPhone}`);

  ledger.recordSent({
    phone: testPhone,
    name: 'Unit Test Student',
    year: testYear,
    date: '2026-11-09',
    message: 'Test message',
    method: 'unit-test'
  });

  assert.strictEqual(ledger.hasBeenSentThisYear(testPhone, testYear), true);
  console.log('  ✓ After recordSent, hasBeenSentThisYear is true');

  // Check that records persist
  const records = ledger.getAllSentRecords();
  const found = records.find(r => r.phone === testPhone && r.year === testYear);
  assert.ok(found);
  console.log('  ✓ Record retrieved from ledger file successfully');
}

// 5. Dynamic Header Matching
console.log('\n[Test 5] Dynamic Google Sheets Column Identification:');
{
  const header = ['ID', 'Student Name', 'Branch / Center', 'Date of Birth (DOB)', 'WhatsApp Contact Number'];
  const mapping = googleSheets.identifyColumns(header);
  assert.strictEqual(mapping.nameIdx, 1);
  assert.strictEqual(mapping.branchIdx, 2);
  assert.strictEqual(mapping.dobIdx, 3);
  assert.strictEqual(mapping.phoneIdx, 4);
  console.log('  ✓ Columns identified properly from complex header row');
}

// 6. Birthday Matching Engine with Today's Date
console.log('\n[Test 6] Student Processing & Categorization:');
{
  const testSentPhone = '0770001122';
  const sanitizedSentPhone = matcher.sanitizePhoneNumber(testSentPhone).sanitized;

  // Mark one student as sent in advance
  ledger.recordSent({
    phone: sanitizedSentPhone,
    name: 'Student Today 2 (Sent)',
    year: 2026,
    date: '2026-11-09',
    message: 'Pre-recorded sent',
    method: 'unit-test'
  });

  const mockStudents = [
    { name: 'Student Today 1', dob: '09/11/2006', phone: '0771112233', branch: 'College' },
    { name: 'Student Today 2 (Sent)', dob: '09/11/1998', phone: testSentPhone, branch: 'Head Office' },
    { name: 'Student Upcoming', dob: '12/11/2005', phone: '0774445566', branch: 'College' },
    { name: 'Student Other Month', dob: '15/05/2004', phone: '0778889900', branch: 'College' }
  ];

  const customToday = { day: 9, month: 11, year: 2026, dateString: '2026-11-09' };
  const results = matcher.processStudentRecords(mockStudents, customToday);

  assert.strictEqual(results.today.length, 2);
  assert.strictEqual(results.stats.pendingTodayCount, 1);
  assert.strictEqual(results.stats.sentTodayCount, 1);
  assert.strictEqual(results.upcoming.length, 1);

  console.log('  ✓ Correctly categorized: 1 Pending Today, 1 Sent Today, 1 Upcoming');
}

// Restore original ledger state
if (originalLedger !== null) {
  fs.writeFileSync(config.SENT_LOG_PATH, originalLedger, 'utf8');
}

console.log('\n==========================================');
console.log('  ✅ ALL TESTS PASSED SUCCESSFULLY!');
console.log('==========================================\n');
