const config = require('../config/env');
const ledger = require('./ledger');

/**
 * Normalizes Sri Lankan phone numbers into standard international format without '+' or spaces.
 * Example: '077 123 4567' -> '94771234567'
 * Example: '+94 71-234-5678' -> '94712345678'
 */
function sanitizePhoneNumber(rawPhone) {
  if (!rawPhone) {
    return { raw: '', sanitized: '', isValid: false, formattedDisplay: 'No Phone' };
  }

  const rawStr = String(rawPhone).trim();
  // Strip non-digit characters
  let digits = rawStr.replace(/\D/g, '');

  // Handle standard Sri Lankan prefixes
  if (digits.startsWith('0094')) {
    digits = digits.substring(2);
  } else if (digits.startsWith('0') && digits.length === 10) {
    // 07XXXXXXXX -> 947XXXXXXXX
    digits = '94' + digits.substring(1);
  } else if (digits.length === 9 && digits.startsWith('7')) {
    // 7XXXXXXXX -> 947XXXXXXXX
    digits = '94' + digits;
  }

  // Validate mobile number: starts with 947 and total 11 digits
  const isSriLankanMobile = /^947\d{8}$/.test(digits);
  // Allow other valid international numbers (at least 10 digits)
  const isValid = isSriLankanMobile || (digits.length >= 10 && digits.length <= 15);

  let formattedDisplay = digits;
  if (isSriLankanMobile) {
    // Format: +94 77 123 4567
    formattedDisplay = `+${digits.substring(0, 2)} ${digits.substring(2, 4)} ${digits.substring(4, 7)} ${digits.substring(7)}`;
  } else if (digits) {
    formattedDisplay = `+${digits}`;
  }

  return {
    raw: rawStr,
    sanitized: digits,
    isValid,
    formattedDisplay
  };
}

/**
 * Parses multiple date formats gracefully:
 * - DD/MM/YYYY or DD-MM-YYYY (Sri Lanka standard)
 * - YYYY-MM-DD
 * - MM/DD/YYYY
 * - Excel date serial numbers
 */
function parseDateOfBirth(rawDate) {
  if (!rawDate) {
    return { day: null, month: null, year: null, isValid: false, formatted: '' };
  }

  let str = String(rawDate).trim().replace(/\.+/g, '.').replace(/\s+/g, ' ');

  // 1. Check for Excel numeric serial date (e.g., 38950)
  if (/^\d{4,5}$/.test(str)) {
    const serial = parseInt(str, 10);
    // Excel epoch begins Dec 30 1899
    const utcDate = new Date((serial - 25569) * 86400 * 1000);
    if (!isNaN(utcDate.getTime())) {
      const d = utcDate.getUTCDate();
      const m = utcDate.getUTCMonth() + 1;
      const y = utcDate.getUTCFullYear();
      return {
        day: d,
        month: m,
        year: y,
        isValid: true,
        formatted: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
      };
    }
  }

  // 2. YYYY-MM-DD or YYYY.MM.DD or YYYY/MM/DD (supports typo 5-digit years like 20018 -> 2018)
  const isoMatch = str.match(/^(\d{4,5})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    let y = parseInt(isoMatch[1], 10);
    if (y > 2100 && String(y).length === 5 && String(y).startsWith('200')) {
      y = parseInt('20' + String(y).substring(3), 10);
    }
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return {
        day: d,
        month: m,
        year: y,
        isValid: true,
        formatted: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
      };
    }
  }

  // 3. DD/MM/YYYY or DD-MM-YYYY or MM/DD/YYYY
  const partsMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (partsMatch) {
    let p1 = parseInt(partsMatch[1], 10);
    let p2 = parseInt(partsMatch[2], 10);
    let y = parseInt(partsMatch[3], 10);

    // Normalize 2-digit years
    if (y < 100) {
      y = y > 30 ? 1900 + y : 2000 + y;
    }

    let day, month;
    if (p1 > 12) {
      // Must be DD/MM/YYYY
      day = p1;
      month = p2;
    } else if (p2 > 12) {
      // Must be MM/DD/YYYY
      month = p1;
      day = p2;
    } else {
      // Default Sri Lankan convention: DD/MM/YYYY
      day = p1;
      month = p2;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        day,
        month,
        year: y,
        isValid: true,
        formatted: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${y}`
      };
    }
  }

  // 4. Standard Date.parse fallback
  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) {
    const day = fallback.getDate();
    const month = fallback.getMonth() + 1;
    const year = fallback.getFullYear();
    return {
      day,
      month,
      year,
      isValid: true,
      formatted: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
    };
  }

  return { day: null, month: null, year: null, isValid: false, formatted: str };
}

/**
 * Returns current date components in the configured timezone (Asia/Colombo).
 */
function getCurrentDateInTimezone(timeZone = config.TIMEZONE) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  // en-CA produces YYYY-MM-DD
  const parts = formatter.format(now).split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  return {
    year,
    month,
    day,
    dateString: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    displayString: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
  };
}

/**
 * Calculates turning age for a birthday in the current year.
 */
function calculateTurningAge(birthYear, currentYear) {
  if (!birthYear || !currentYear || birthYear > currentYear) return null;
  return currentYear - birthYear;
}

/**
 * Determines days until next birthday from today.
 * Returns 0 if today, 1-7 for upcoming in the next week, or null if further away.
 */
function getDaysUntilBirthday(bDay, bMonth, todayDay, todayMonth, todayYear) {
  const currentBdayThisYear = new Date(todayYear, bMonth - 1, bDay);
  const todayDate = new Date(todayYear, todayMonth - 1, todayDay);

  let diffTime = currentBdayThisYear.getTime() - todayDate.getTime();
  let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // If already passed earlier this year, calculate for next year
  if (diffDays < 0) {
    const nextYearBday = new Date(todayYear + 1, bMonth - 1, bDay);
    diffTime = nextYearBday.getTime() - todayDate.getTime();
    diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  }

  return diffDays;
}

/**
 * Formats a message template by substituting student placeholders.
 */
function formatMessage(template, student) {
  const base = template || config.DEFAULT_TEMPLATE;
  const firstName = student.name ? student.name.trim().split(' ')[0] : 'Student';
  return base
    .replace(/{name}/g, student.name || 'Student')
    .replace(/{first_name}/g, firstName)
    .replace(/{branch}/g, student.branch || 'Sussex')
    .replace(/{age}/g, student.age ? `${student.age}` : '');
}

/**
 * Analyzes a raw list of student records from Google Sheets / CSV and categorizes them.
 */
function processStudentRecords(rawStudents, customToday = null) {
  const today = customToday || getCurrentDateInTimezone();
  const results = {
    todayInfo: today,
    stats: {
      totalStudents: rawStudents.length,
      pendingTodayCount: 0,
      sentTodayCount: 0,
      upcomingCount: 0
    },
    today: [],
    upcoming: []
  };

  rawStudents.forEach((raw, index) => {
    const name = String(raw.name || raw['Student Name'] || raw.student_name || '').trim();
    const rawDob = raw.dob || raw['Date of Birth'] || raw.date_of_birth || raw.DOB || '';
    const rawPhone = raw.phone || raw['Phone Number'] || raw.phone_number || raw.WhatsApp || raw['Contact Number'] || '';
    const branch = String(raw.branch || raw['Branch'] || raw.Branch || raw.location || 'College').trim();

    if (!name && !rawPhone) {
      return; // Skip empty rows
    }

    const phoneInfo = sanitizePhoneNumber(rawPhone);
    const dobInfo = parseDateOfBirth(rawDob);

    if (!dobInfo.isValid) {
      return;
    }

    const age = calculateTurningAge(dobInfo.year, today.year);
    const daysUntil = getDaysUntilBirthday(dobInfo.day, dobInfo.month, today.day, today.month, today.year);

    const studentRecord = {
      id: raw.id || `row_${index + 1}`,
      name,
      branch: branch || 'College',
      branchId: raw.branchId || null,
      branchCustomTemplate: raw.branchCustomTemplate || null,
      dobFormatted: dobInfo.formatted,
      dobRaw: rawDob,
      birthYear: dobInfo.year,
      age,
      phone: phoneInfo.sanitized,
      phoneRaw: phoneInfo.raw,
      phoneDisplay: phoneInfo.formattedDisplay,
      isPhoneValid: phoneInfo.isValid,
      daysUntil
    };

    // Check if birthday is TODAY
    if (dobInfo.day === today.day && dobInfo.month === today.month) {
      const alreadySent = ledger.hasBeenSentThisYear(phoneInfo.sanitized, today.year);
      studentRecord.status = alreadySent ? 'SENT_TODAY' : 'PENDING_TODAY';

      if (alreadySent) {
        results.stats.sentTodayCount++;
      } else {
        results.stats.pendingTodayCount++;
      }

      results.today.push(studentRecord);
    } else if (daysUntil >= 1 && daysUntil <= 7) {
      // Upcoming within 7 days
      studentRecord.status = 'UPCOMING';
      results.stats.upcomingCount++;
      results.upcoming.push(studentRecord);
    }
  });

  // Sort upcoming by closest day
  results.upcoming.sort((a, b) => a.daysUntil - b.daysUntil);

  return results;
}

module.exports = {
  sanitizePhoneNumber,
  parseDateOfBirth,
  getCurrentDateInTimezone,
  calculateTurningAge,
  getDaysUntilBirthday,
  formatMessage,
  processStudentRecords
};

