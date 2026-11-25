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

const MONTH_NAME_MAP = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12
};

const MAX_DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function normalizeYearNumber(rawYear) {
  if (rawYear === undefined || rawYear === null || rawYear === '') return null;
  let y = parseInt(rawYear, 10);
  if (isNaN(y)) return null;
  if (y < 100) {
    y = y > 30 ? 1900 + y : 2000 + y;
  } else if (y > 2100 && String(y).length === 5 && String(y).startsWith('200')) {
    // Handles typos like 20018 -> 2018
    y = parseInt('20' + String(y).substring(3), 10);
  }
  return y;
}

function buildValidDobResult(day, month, year = null) {
  if (
    !Number.isInteger(month) || month < 1 || month > 12 ||
    !Number.isInteger(day) || day < 1 || day > MAX_DAYS_IN_MONTH[month - 1]
  ) {
    return null;
  }
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  return {
    day,
    month,
    year,
    isValid: true,
    formatted: year ? `${dd}/${mm}/${year}` : `${dd}/${mm}`
  };
}

/**
 * Parses multiple date formats gracefully:
 * - Excel / Google Sheets date serial numbers (including fractional timestamps)
 * - DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, or DD/MM (Sri Lanka standard default)
 * - MM/DD/YYYY (when day > 12 or options.dateOrder === 'MDY')
 * - YYYY-MM-DD / YYYY/MM/DD / ISO timestamps
 * - Named months: "12 Nov 2018", "12th November 2018", "12-Nov", "Nov 12, 2018"
 */
function parseDateOfBirth(rawDate, options = {}) {
  if (rawDate === undefined || rawDate === null || rawDate === '') {
    return { day: null, month: null, year: null, isValid: false, formatted: '' };
  }

  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
    const res = buildValidDobResult(rawDate.getDate(), rawDate.getMonth() + 1, rawDate.getFullYear());
    if (res) return res;
  }

  let str = String(rawDate)
    .trim()
    .replace(/^['"`\s]+|['"`\s]+$/g, '')
    .replace(/[\u2012\u2013\u2014\u2015\u2212]/g, '-')
    .replace(/\.+/g, '.')
    .replace(/\s+/g, ' ')
    .replace(/^(?:dob|date of birth|birthday|bday)\s*[:=-]\s*/i, '')
    .replace(/T\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/i, '')
    .replace(/\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?$/i, '')
    .replace(/\b(\d{1,2})(?:st|nd|rd|th)\b/gi, '$1')
    .trim();

  if (!str) {
    return { day: null, month: null, year: null, isValid: false, formatted: '' };
  }

  // 1. Excel / Google Sheets numeric serial date (e.g., 38950 or 43416.5; ignore bare 4-digit years like 2018)
  if (/^\d{4,5}(?:\.\d+)?$/.test(str)) {
    const serial = Math.floor(Number(str));
    if (serial >= 3653 && serial < 90000) {
      const utcDate = new Date((serial - 25569) * 86400 * 1000);
      if (!isNaN(utcDate.getTime())) {
        const res = buildValidDobResult(utcDate.getUTCDate(), utcDate.getUTCMonth() + 1, utcDate.getUTCFullYear());
        if (res) return res;
      }
    }
  }

  // 2. Month-name formats (handles DD/Nov/YYYY, 12.Nov.2018, 12-Nov, Nov 12, 2018, 2018-Nov-12)
  const dayMonthYearMatch = str.match(/^(\d{1,2})[\s./,-]+([a-zA-Z]{3,12})(?:[\s./,-]+(\d{2,5}))?$/);
  if (dayMonthYearMatch) {
    const month = MONTH_NAME_MAP[dayMonthYearMatch[2].toLowerCase()];
    if (month) {
      const res = buildValidDobResult(
        parseInt(dayMonthYearMatch[1], 10),
        month,
        normalizeYearNumber(dayMonthYearMatch[3])
      );
      if (res) return res;
    }
  }

  const monthDayYearMatch = str.match(/^([a-zA-Z]{3,12})[\s./,-]+(\d{1,2})(?:[\s./,-]+(\d{2,5}))?$/);
  if (monthDayYearMatch) {
    const month = MONTH_NAME_MAP[monthDayYearMatch[1].toLowerCase()];
    if (month) {
      const res = buildValidDobResult(
        parseInt(monthDayYearMatch[2], 10),
        month,
        normalizeYearNumber(monthDayYearMatch[3])
      );
      if (res) return res;
    }
  }

  const yearMonthNameDayMatch = str.match(/^(\d{4,5})[\s./,-]+([a-zA-Z]{3,12})[\s./,-]+(\d{1,2})$/);
  if (yearMonthNameDayMatch) {
    const month = MONTH_NAME_MAP[yearMonthNameDayMatch[2].toLowerCase()];
    if (month) {
      const res = buildValidDobResult(
        parseInt(yearMonthNameDayMatch[3], 10),
        month,
        normalizeYearNumber(yearMonthNameDayMatch[1])
      );
      if (res) return res;
    }
  }

  // 3. YYYY-MM-DD or YYYY.MM.DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4,5})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{1,2})$/);
  if (isoMatch) {
    const res = buildValidDobResult(
      parseInt(isoMatch[3], 10),
      parseInt(isoMatch[2], 10),
      normalizeYearNumber(isoMatch[1])
    );
    if (res) return res;
  }

  // 4. Numeric DD/MM/YYYY, MM/DD/YYYY, DD-MM-YY, or DD/MM (tolerates spaces around separators and commas)
  const partsMatch = str.match(/^(\d{1,2})\s*[-/.,]\s*(\d{1,2})(?:\s*[-/.,]\s*(\d{2,5}))?$/);
  if (partsMatch) {
    const p1 = parseInt(partsMatch[1], 10);
    const p2 = parseInt(partsMatch[2], 10);
    const y = normalizeYearNumber(partsMatch[3]);

    let day, month;
    if (p1 > 12) {
      day = p1;
      month = p2;
    } else if (p2 > 12) {
      month = p1;
      day = p2;
    } else if (options.dateOrder === 'MDY') {
      month = p1;
      day = p2;
    } else {
      // Default Sri Lankan convention: DD/MM/YYYY
      day = p1;
      month = p2;
    }

    const res = buildValidDobResult(day, month, y);
    if (res) return res;
  }

  // 5. Standard Date.parse fallback for any other textual date formats (ignore bare numbers like '2018')
  if (!/^\d+(?:\.\d+)?$/.test(str)) {
    const fallback = new Date(str);
    if (!isNaN(fallback.getTime())) {
      const res = buildValidDobResult(fallback.getDate(), fallback.getMonth() + 1, fallback.getFullYear());
      if (res) return res;
    }
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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Returns UTC day-of-week (0 = Sun, 1 = Mon) and the previous calendar date for a YYYY/MM/DD object.
 * (Maintained for backward compatibility)
 */
function getWeekdayAndPreviousDay(dateObj) {
  const utcMs = Date.UTC(dateObj.year, dateObj.month - 1, dateObj.day);
  const utcDate = new Date(utcMs);
  const dayOfWeek = utcDate.getUTCDay();
  const prevUtc = new Date(utcMs - 86400000);
  const prevYear = prevUtc.getUTCFullYear();
  const prevMonth = prevUtc.getUTCMonth() + 1;
  const prevDay = prevUtc.getUTCDate();
  return {
    dayOfWeek,
    isMonday: dayOfWeek === 1,
    previousDay: {
      year: prevYear,
      month: prevMonth,
      day: prevDay,
      dateString: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(prevDay).padStart(2, '0')}`,
      displayString: `${String(prevDay).padStart(2, '0')}/${String(prevMonth).padStart(2, '0')}/${prevYear}`
    }
  };
}

/**
 * Computes an ordered array of date objects between lastRunDate (exclusive) and todayDateObj (inclusive).
 * Any date prior to today in this list represents a missed day (e.g. computer was powered off / closed).
 */
function getMissedDateRange(lastRunDateStr, todayDateObj, options = {}) {
  const maxLookbackDays = Number.isInteger(options.maxLookbackDays) && options.maxLookbackDays > 0
    ? options.maxLookbackDays
    : 30;

  const todayUtcMs = Date.UTC(todayDateObj.year, todayDateObj.month - 1, todayDateObj.day);
  const todayUtc = new Date(todayUtcMs);
  const todayDateString = todayDateObj.dateString || `${todayDateObj.year}-${String(todayDateObj.month).padStart(2, '0')}-${String(todayDateObj.day).padStart(2, '0')}`;
  const todayDisplayString = todayDateObj.displayString || `${String(todayDateObj.day).padStart(2, '0')}/${String(todayDateObj.month).padStart(2, '0')}/${todayDateObj.year}`;

  const todayItem = {
    year: todayDateObj.year,
    month: todayDateObj.month,
    day: todayDateObj.day,
    dateString: todayDateString,
    displayString: todayDisplayString,
    dayOfWeek: todayUtc.getUTCDay(),
    dayName: DAY_NAMES[todayUtc.getUTCDay()],
    isToday: true,
    isMissedCarryOver: false,
    isSunday: todayUtc.getUTCDay() === 0
  };

  // Check if carryover is explicitly disabled
  const isCarryOverEnabled = options.carryOverMissedBirthdays !== false &&
    options.includeMissedDays !== false &&
    options.sundayCatchUpOnMonday !== false &&
    options.includeSundayCatchUp !== false;

  if (!isCarryOverEnabled) {
    return [todayItem];
  }

  let startUtcMs;
  if (lastRunDateStr && typeof lastRunDateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(lastRunDateStr)) {
    const [y, m, d] = lastRunDateStr.split('-').map(Number);
    startUtcMs = Date.UTC(y, m - 1, d);
  } else {
    // If no lastRunDate is recorded, default lookback:
    // If today is Monday, look back to Saturday (2 days) so Sunday is included; otherwise look back to yesterday (1 day)
    const defaultOffsetDays = todayUtc.getUTCDay() === 1 ? 2 : 1;
    startUtcMs = todayUtcMs - (defaultOffsetDays * 86400000);
  }

  // If lastRunDate is today or future, only today is checked
  if (startUtcMs >= todayUtcMs) {
    return [todayItem];
  }

  // Cap lookback at maxLookbackDays
  const minAllowedUtcMs = todayUtcMs - (maxLookbackDays * 86400000);
  if (startUtcMs < minAllowedUtcMs) {
    startUtcMs = minAllowedUtcMs;
  }

  const range = [];
  let currentMs = startUtcMs + 86400000;
  while (currentMs <= todayUtcMs) {
    const curDate = new Date(currentMs);
    const cYear = curDate.getUTCFullYear();
    const cMonth = curDate.getUTCMonth() + 1;
    const cDay = curDate.getUTCDate();
    const cDateStr = `${cYear}-${String(cMonth).padStart(2, '0')}-${String(cDay).padStart(2, '0')}`;
    const cDispStr = `${String(cDay).padStart(2, '0')}/${String(cMonth).padStart(2, '0')}/${cYear}`;
    const cDayOfWeek = curDate.getUTCDay();
    const isToday = (currentMs === todayUtcMs);

    range.push({
      year: cYear,
      month: cMonth,
      day: cDay,
      dateString: cDateStr,
      displayString: cDispStr,
      dayOfWeek: cDayOfWeek,
      dayName: DAY_NAMES[cDayOfWeek],
      isToday,
      isMissedCarryOver: !isToday,
      isSunday: cDayOfWeek === 0
    });

    currentMs += 86400000;
  }

  return range.length > 0 ? range : [todayItem];
}

/**
 * Analyzes a raw list of student records from Google Sheets / CSV and categorizes them.
 */
function processStudentRecords(rawStudents, customTodayOrOptions = null, extraOptions = {}) {
  const hasCustomToday = Boolean(
    customTodayOrOptions &&
    Number.isInteger(customTodayOrOptions.day) &&
    Number.isInteger(customTodayOrOptions.month) &&
    Number.isInteger(customTodayOrOptions.year)
  );
  const today = hasCustomToday ? customTodayOrOptions : getCurrentDateInTimezone();
  const options = hasCustomToday ? (extraOptions || {}) : (customTodayOrOptions || {});

  const lastRunDate = options.lastRunDate !== undefined ? options.lastRunDate : ledger.getLastRunDate();
  const dateRange = getMissedDateRange(lastRunDate, today, options);
  const missedDaysList = dateRange.filter(d => d.isMissedCarryOver);
  const isMonday = (new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay() === 1);
  const dayContext = getWeekdayAndPreviousDay(today);

  const results = {
    todayInfo: {
      ...today,
      isMonday,
      lastRunDate,
      missedDaysCount: missedDaysList.length,
      missedDates: missedDaysList.map(d => d.dateString),
      sundayCatchUpEnabled: options.carryOverMissedBirthdays !== false && options.includeSundayCatchUp !== false,
      previousDateString: dayContext.previousDay.dateString
    },
    stats: {
      totalStudents: rawStudents.length,
      pendingTodayCount: 0,
      sentTodayCount: 0,
      upcomingCount: 0,
      missedCarryOverCount: 0,
      sundayCatchUpCount: 0
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
    const dobInfo = parseDateOfBirth(rawDob, { dateOrder: raw.dateOrderHint || 'DMY' });

    if (!dobInfo.isValid) {
      return;
    }

    // Check if the student's birthday falls on any date in the active check window (today or missed days)
    const matchedDate = dateRange.find(d => d.day === dobInfo.day && d.month === dobInfo.month);

    if (matchedDate) {
      const isExactToday = matchedDate.isToday;
      const isMissedCarryOver = !isExactToday;
      const matchYear = matchedDate.year;
      const age = calculateTurningAge(dobInfo.year, matchYear);
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
        daysUntil,
        ledgerYear: matchYear,
        isMissedCarryOver,
        isSundayCatchUp: isMissedCarryOver && matchedDate.dayOfWeek === 0,
        missedDate: isMissedCarryOver ? matchedDate.dateString : null,
        missedDateDisplay: isMissedCarryOver ? matchedDate.displayString : null,
        missedDayLabel: isMissedCarryOver ? matchedDate.dayName : null,
        birthdayDateDisplay: isMissedCarryOver ? matchedDate.displayString : null
      };

      const sentRecord = phoneInfo.sanitized
        ? ledger.getSentRecord(phoneInfo.sanitized, matchYear)
        : null;
      const alreadySent = Boolean(sentRecord && sentRecord.status === 'SENT');

      if (isMissedCarryOver) {
        // Skip missed birthdays that were already delivered on their original date before shutdown
        if (alreadySent && sentRecord.dateSent !== today.dateString) {
          return;
        }

        studentRecord.status = alreadySent ? 'SENT_TODAY' : 'PENDING_TODAY';
        results.stats.missedCarryOverCount++;
        results.stats.sundayCatchUpCount++;

        if (alreadySent) {
          results.stats.sentTodayCount++;
        } else {
          results.stats.pendingTodayCount++;
        }

        results.today.push(studentRecord);
      } else {
        // Exact today
        studentRecord.status = alreadySent ? 'SENT_TODAY' : 'PENDING_TODAY';
        if (alreadySent) {
          results.stats.sentTodayCount++;
        } else {
          results.stats.pendingTodayCount++;
        }
        results.today.push(studentRecord);
      }
    } else {
      // Check upcoming within 7 days from today
      const daysUntil = getDaysUntilBirthday(dobInfo.day, dobInfo.month, today.day, today.month, today.year);
      if (daysUntil >= 1 && daysUntil <= 7) {
        const studentRecord = {
          id: raw.id || `row_${index + 1}`,
          name,
          branch: branch || 'College',
          branchId: raw.branchId || null,
          branchCustomTemplate: raw.branchCustomTemplate || null,
          dobFormatted: dobInfo.formatted,
          dobRaw: rawDob,
          birthYear: dobInfo.year,
          age: calculateTurningAge(dobInfo.year, today.year),
          phone: phoneInfo.sanitized,
          phoneRaw: phoneInfo.raw,
          phoneDisplay: phoneInfo.formattedDisplay,
          isPhoneValid: phoneInfo.isValid,
          daysUntil,
          ledgerYear: today.year,
          isMissedCarryOver: false,
          isSundayCatchUp: false,
          missedDayLabel: null,
          birthdayDateDisplay: null,
          status: 'UPCOMING'
        };
        results.stats.upcomingCount++;
        results.upcoming.push(studentRecord);
      }
    }
  });

  // Sort today's list: exact today first, then missed carryovers by date ascending
  results.today.sort((a, b) => {
    if (a.isMissedCarryOver !== b.isMissedCarryOver) {
      return Number(Boolean(a.isMissedCarryOver)) - Number(Boolean(b.isMissedCarryOver));
    }
    if (a.missedDate && b.missedDate) {
      return a.missedDate.localeCompare(b.missedDate);
    }
    return 0;
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
  getWeekdayAndPreviousDay,
  getMissedDateRange,
  formatMessage,
  processStudentRecords
};

