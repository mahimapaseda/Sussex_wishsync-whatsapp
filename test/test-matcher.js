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

  // Check that records persist and can be cleared back to pending
  const records = ledger.getAllSentRecords();
  const found = records.find(r => r.phone === testPhone && r.year === testYear);
  assert.ok(found);
  console.log('  ✓ Record retrieved from ledger file successfully');

  assert.strictEqual(ledger.clearSentRecord(testPhone, testYear), true);
  assert.strictEqual(ledger.hasBeenSentThisYear(testPhone, testYear), false);
  console.log('  ✓ clearSentRecord resets student back to pending');
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

// 7. Extended Google Sheets Date Formats & Column Detection
console.log('\n[Test 7] Extended DOB Formats, Split Columns & Sheet Fetching:');
(async () => {
  // Apostrophe, spaces, ordinals, en-dash, commas, missing year, fractional serial, MDY hint
  const nov12Cases = [
    ["'12/11/2018", {}],
    ['12 / 11 / 2018', {}],
    ['12th Nov 2018', {}],
    ['12\u201311\u20132018', {}],
    ['12,11,2018', {}],
    ['12/11', {}],
    ['12-Nov', {}],
    ['43416.5', {}],
    ['11/12/2018', { dateOrder: 'MDY' }],
    ['2018-Nov-12', {}],
    ['DOB: 12.Nov.2018', {}]
  ];
  for (const [input, opts] of nov12Cases) {
    const parsed = matcher.parseDateOfBirth(input, opts);
    assert.strictEqual(parsed.isValid, true, `Expected valid date for ${input}`);
    assert.strictEqual(parsed.day, 12, `Expected day=12 for ${input}, got ${parsed.day}`);
    assert.strictEqual(parsed.month, 11, `Expected month=11 for ${input}, got ${parsed.month}`);
  }
  assert.strictEqual(matcher.parseDateOfBirth('2018').isValid, false, 'Bare year must not parse as 1905 serial');
  console.log('  ✓ Extended DOB formats (ordinals, en-dash, serials, no-year, MDY hint) parsed accurately');

  // Hierarchical 2-row sub-headers + Inquiry Date collision check
  const splitRows = [
    ['No', 'Date', 'Student Name', 'Contact No', 'Date of Birth', '', ''],
    ['', '', '', '', 'Date', 'Month', 'Year'],
    ['1', '10/01/2026', 'Nethmi', '0771112233', '12', 'November', '2019']
  ];
  const splitMap = googleSheets.identifyColumnsFromRows(splitRows);
  assert.strictEqual(splitMap.headerRowIdx, 1);
  assert.strictEqual(splitMap.dayIdx, 4);
  assert.strictEqual(splitMap.monthIdx, 5);
  assert.strictEqual(splitMap.yearIdx, 6);
  console.log('  ✓ 2-row split Date/Month/Year sub-headers mapped without Inquiry Date collision');

  // Late banner row + Child Name / T.P. / Birthday labels + early Day column (< 4)
  const lateBannerRows = [
    ['SUSSEX COLLEGE NETWORK'],
    ['INQUIRY REGISTER'],
    [],
    ['Child Name', 'Father T.P.', 'Day', 'Month', 'Year'],
    ['Kavisha', '0775556667', '12', '11', '2020']
  ];
  const lateMap = googleSheets.identifyColumnsFromRows(lateBannerRows);
  assert.strictEqual(lateMap.headerRowIdx, 3);
  assert.strictEqual(lateMap.nameIdx, 0);
  assert.strictEqual(lateMap.phoneIdx, 1);
  assert.strictEqual(lateMap.dayIdx, 2);
  assert.strictEqual(lateMap.monthIdx, 3);
  console.log('  ✓ Banner offset rows, Child Name / Father T.P., and early Day column detected');

  // Mock fetchBranchStudents: US-formatted real date cell (serial 43416) + text MDY + past column Z
  const header28 = Array(28).fill('');
  header28[0] = 'Student Name';
  header28[1] = 'Birthday';
  header28[27] = 'WhatsApp'; // Column AB (past Z!)
  const dataFormatted1 = Array(28).fill('');
  dataFormatted1[0] = 'US Sheet Serial Student';
  dataFormatted1[1] = '11/12/2018'; // Formatted as MM/DD in US locale
  dataFormatted1[27] = '0772223344';
  const dataUnformatted1 = Array(28).fill('');
  dataUnformatted1[0] = 'US Sheet Serial Student';
  dataUnformatted1[1] = 43416; // Exact serial for 12 Nov 2018
  dataUnformatted1[27] = 772223344;

  const mockSheetsClient = {
    authType: 'Test',
    client: {
      spreadsheets: {
        get: async () => ({ data: { sheets: [{ properties: { title: "Sussex's 2026" } }] } }),
        values: {
          get: async (params) => {
            assert.strictEqual(params.range, "'Sussex''s 2026'");
            if (params.valueRenderOption === 'UNFORMATTED_VALUE') {
              return { data: { values: [header28, dataUnformatted1] } };
            }
            return { data: { values: [header28, dataFormatted1] } };
          }
        }
      }
    }
  };

  const branchRes = await googleSheets.fetchBranchStudents(
    { id: 'test_b', name: 'Test Branch', spreadsheetId: 'mock_id', sheetName: "Sussex's 2026" },
    mockSheetsClient
  );
  assert.strictEqual(branchRes.status, 'CONNECTED');
  assert.strictEqual(branchRes.students.length, 1);

  const nov12Today = { day: 12, month: 11, year: 2026, dateString: '2026-11-12' };
  const matched = matcher.processStudentRecords(branchRes.students, nov12Today);
  assert.strictEqual(matched.today.length, 1, 'Expected US serial + col AB phone student to match Nov 12');
  assert.strictEqual(matched.today[0].phone, '94772223344');

  // Column inference for text-only MDY sheet
  const mdyOrder = googleSheets.inferColumnDateOrder(
    [['Name', 'DOB'], ['A', '11/25/2018'], ['B', '11/12/2018']],
    1,
    1
  );
  assert.strictEqual(mdyOrder, 'MDY');
  console.log('  ✓ Full-sheet fetch past column Z, serial dates, and MDY inference verified');

  // Restore original ledger state
  if (originalLedger !== null) {
    fs.writeFileSync(config.SENT_LOG_PATH, originalLedger, 'utf8');
  }

  console.log('\n==========================================');
  console.log('  ✅ ALL TESTS PASSED SUCCESSFULLY!');
  console.log('==========================================');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
