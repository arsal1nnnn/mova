/**
 * Mova Campus — Attendance Validation & Calculation Utilities
 *
 * Pure, dependency-free helpers for attendance tracking:
 * input validation, percentage calculation, safe-bunk computation,
 * recovery estimation, and attendance status classification.
 *
 * All functions are stateless and unit-testable without Supabase.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEFAULT_TARGET_PERCENTAGE = 75;
export const MIN_TARGET_PERCENTAGE = 1;
export const MAX_TARGET_PERCENTAGE = 100;
export const MAX_SUBJECT_NAME_LENGTH = 100;
export const VALID_ATTENDANCE_STATUSES = ['present', 'absent'];

/**
 * Attendance status thresholds relative to the subject's target.
 * - 'on_track':  percentage >= target
 * - 'at_risk':   percentage is within 10 points below the target
 * - 'below':     percentage is more than 10 points below the target
 */
export const ATTENDANCE_THRESHOLDS = {
  AT_RISK_MARGIN: 10,
};

// ---------------------------------------------------------------------------
// Subject Validation
// ---------------------------------------------------------------------------

/**
 * Validates a subject name.
 *
 * @param {unknown} name
 * @returns {{ isValid: boolean, error: string | null, sanitizedValue: string }}
 */
export function validateSubjectName(name) {
  if (typeof name !== 'string') {
    return { isValid: false, error: 'Subject name must be a text string.', sanitizedValue: '' };
  }

  const trimmed = name.trim();
  if (trimmed.length < 1) {
    return { isValid: false, error: 'Subject name cannot be empty.', sanitizedValue: '' };
  }

  if (trimmed.length > MAX_SUBJECT_NAME_LENGTH) {
    return {
      isValid: false,
      error: `Subject name must be ${MAX_SUBJECT_NAME_LENGTH} characters or fewer.`,
      sanitizedValue: trimmed,
    };
  }

  return { isValid: true, error: null, sanitizedValue: trimmed };
}

/**
 * Validates a target attendance percentage.
 *
 * @param {unknown} target
 * @returns {{ isValid: boolean, error: string | null, sanitizedValue: number }}
 */
export function validateTargetPercentage(target) {
  // Allow string numbers from form inputs
  const num = typeof target === 'string' && target.trim() !== '' ? Number(target) : target;

  if (target === null || target === undefined) {
    // Default value is acceptable
    return { isValid: true, error: null, sanitizedValue: DEFAULT_TARGET_PERCENTAGE };
  }

  if (typeof num !== 'number' || !Number.isInteger(num)) {
    return {
      isValid: false,
      error: 'Target percentage must be a whole number.',
      sanitizedValue: DEFAULT_TARGET_PERCENTAGE,
    };
  }

  if (num < MIN_TARGET_PERCENTAGE || num > MAX_TARGET_PERCENTAGE) {
    return {
      isValid: false,
      error: `Target percentage must be between ${MIN_TARGET_PERCENTAGE}% and ${MAX_TARGET_PERCENTAGE}%.`,
      sanitizedValue: DEFAULT_TARGET_PERCENTAGE,
    };
  }

  return { isValid: true, error: null, sanitizedValue: num };
}

/**
 * Validates baseline attendance numbers and date.
 *
 * @param {object} baseline - { attended, total, as_of_date } or { baseline_attended, baseline_total, baseline_as_of_date }
 * @returns {{ isValid: boolean, errors: Record<string, string>, sanitizedData: { baseline_attended: number, baseline_total: number, baseline_as_of_date: string | null } }}
 */
export function validateBaselineAttendance(baseline = {}) {
  const errors = {};

  const rawAttended = baseline.baseline_attended ?? baseline.attended ?? 0;
  const rawTotal = baseline.baseline_total ?? baseline.total ?? 0;
  const rawDate = baseline.baseline_as_of_date ?? baseline.as_of_date ?? null;

  const attendedNum = typeof rawAttended === 'string' && rawAttended.trim() !== '' ? Number(rawAttended) : rawAttended;
  const totalNum = typeof rawTotal === 'string' && rawTotal.trim() !== '' ? Number(rawTotal) : rawTotal;

  if (typeof attendedNum !== 'number' || !Number.isInteger(attendedNum) || attendedNum < 0) {
    errors.baseline_attended = 'Attended classes must be a non-negative whole number.';
  }

  if (typeof totalNum !== 'number' || !Number.isInteger(totalNum) || totalNum < 0) {
    errors.baseline_total = 'Total classes must be a non-negative whole number.';
  }

  if (!errors.baseline_attended && !errors.baseline_total && attendedNum > totalNum) {
    errors.baseline_attended = 'Attended classes cannot exceed total classes conducted.';
  }

  let sanitizedDate = null;
  if (rawDate !== null && rawDate !== undefined && String(rawDate).trim() !== '') {
    const dateVal = validateAttendanceDate(String(rawDate).trim());
    if (!dateVal.isValid) {
      errors.baseline_as_of_date = dateVal.error;
    } else {
      sanitizedDate = dateVal.sanitizedValue;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData: {
      baseline_attended: errors.baseline_attended ? 0 : Math.max(0, attendedNum || 0),
      baseline_total: errors.baseline_total ? 0 : Math.max(0, totalNum || 0),
      baseline_as_of_date: sanitizedDate,
    },
  };
}

/**
 * Validates a complete subject input payload.
 *
 * @param {object} input
 * @returns {{ isValid: boolean, errors: Record<string, string>, sanitizedData: object }}
 */
export function validateSubjectInput(input = {}) {
  const errors = {};

  const nameVal = validateSubjectName(input.name);
  if (!nameVal.isValid) errors.name = nameVal.error;

  const targetVal = validateTargetPercentage(input.target_percentage);
  if (!targetVal.isValid) errors.target_percentage = targetVal.error;

  let baselineData = {
    baseline_attended: 0,
    baseline_total: 0,
    baseline_as_of_date: null,
  };

  if (
    input.baseline_attended !== undefined ||
    input.baseline_total !== undefined ||
    input.baseline_as_of_date !== undefined ||
    input.attended !== undefined ||
    input.total !== undefined
  ) {
    const baseVal = validateBaselineAttendance(input);
    if (!baseVal.isValid) {
      Object.assign(errors, baseVal.errors);
    }
    baselineData = baseVal.sanitizedData;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData: {
      name: nameVal.sanitizedValue,
      target_percentage: targetVal.sanitizedValue,
      ...baselineData,
    },
  };
}

// ---------------------------------------------------------------------------
// Attendance Record Validation
// ---------------------------------------------------------------------------

/**
 * Validates an attendance status value.
 *
 * @param {unknown} status
 * @returns {{ isValid: boolean, error: string | null, sanitizedValue: string }}
 */
export function validateAttendanceStatus(status) {
  if (typeof status !== 'string') {
    return { isValid: false, error: 'Attendance status must be a string.', sanitizedValue: '' };
  }

  const lower = status.trim().toLowerCase();

  if (!VALID_ATTENDANCE_STATUSES.includes(lower)) {
    return {
      isValid: false,
      error: `Attendance status must be one of: ${VALID_ATTENDANCE_STATUSES.join(', ')}.`,
      sanitizedValue: '',
    };
  }

  return { isValid: true, error: null, sanitizedValue: lower };
}

/**
 * Validates an attendance date string (YYYY-MM-DD).
 * Rejects clearly invalid calendar dates. Allows today and past dates.
 * Allows up to 1 day in the future (timezone tolerance).
 *
 * @param {unknown} dateStr
 * @returns {{ isValid: boolean, error: string | null, sanitizedValue: string }}
 */
export function validateAttendanceDate(dateStr) {
  if (typeof dateStr !== 'string') {
    return { isValid: false, error: 'Date must be a string in YYYY-MM-DD format.', sanitizedValue: '' };
  }

  const trimmed = dateStr.trim();
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(trimmed)) {
    return { isValid: false, error: 'Date must be in YYYY-MM-DD format.', sanitizedValue: '' };
  }

  // Parse and validate the calendar date
  const [year, month, day] = trimmed.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);

  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day
  ) {
    return { isValid: false, error: 'Invalid calendar date.', sanitizedValue: '' };
  }

  // Allow up to tomorrow (timezone tolerance)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);

  if (dateObj > tomorrow) {
    return { isValid: false, error: 'Attendance date cannot be in the future.', sanitizedValue: '' };
  }

  return { isValid: true, error: null, sanitizedValue: trimmed };
}

/**
 * Validates a complete attendance record input.
 *
 * @param {object} input  - { subject_id, date, status }
 * @returns {{ isValid: boolean, errors: Record<string, string>, sanitizedData: object }}
 */
export function validateAttendanceRecordInput(input = {}) {
  const errors = {};

  // subject_id: must be a non-empty string (UUID)
  if (!input.subject_id || typeof input.subject_id !== 'string' || input.subject_id.trim().length === 0) {
    errors.subject_id = 'Subject ID is required.';
  }

  const dateVal = validateAttendanceDate(input.date);
  if (!dateVal.isValid) errors.date = dateVal.error;

  const statusVal = validateAttendanceStatus(input.status ?? 'present');
  if (!statusVal.isValid) errors.status = statusVal.error;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData: {
      subject_id: typeof input.subject_id === 'string' ? input.subject_id.trim() : '',
      date: dateVal.sanitizedValue,
      status: statusVal.sanitizedValue || 'present',
    },
  };
}

// ---------------------------------------------------------------------------
// Attendance Calculations (Pure Functions)
// ---------------------------------------------------------------------------

/**
 * Calculates attendance percentage.
 *
 * @param {number} totalClasses  - Total number of classes (attended + missed)
 * @param {number} attendedClasses - Number of classes attended
 * @returns {number} Percentage rounded to two decimal places, or 0 if no classes
 */
export function calculateAttendancePercentage(totalClasses, attendedClasses) {
  if (!Number.isFinite(totalClasses) || !Number.isFinite(attendedClasses)) return 0;
  if (totalClasses <= 0) return 0;
  if (attendedClasses < 0) return 0;
  if (attendedClasses > totalClasses) return 100;

  return Math.round((attendedClasses / totalClasses) * 10000) / 100;
}

/**
 * Calculates how many future classes can be safely missed (bunked)
 * while still maintaining the target attendance percentage.
 *
 * Formula: We need attended / (total + bunks) >= target / 100
 *   => bunks <= (attended * 100 / target) - total
 *   => safeBunks = floor((attended * 100 / target) - total)
 *
 * Returns 0 if already at or below the target.
 *
 * @param {number} totalClasses
 * @param {number} attendedClasses
 * @param {number} [targetPercentage=75]
 * @returns {number} Maximum classes that can be missed, or 0
 */
export function calculateSafeBunks(totalClasses, attendedClasses, targetPercentage = DEFAULT_TARGET_PERCENTAGE) {
  if (!Number.isFinite(totalClasses) || !Number.isFinite(attendedClasses) || !Number.isFinite(targetPercentage)) {
    return 0;
  }
  if (totalClasses <= 0 || attendedClasses < 0 || targetPercentage <= 0 || targetPercentage > 100) {
    return 0;
  }

  const currentPercentage = (attendedClasses / totalClasses) * 100;
  if (currentPercentage < targetPercentage) {
    return 0; // Already below target, cannot bunk
  }

  const maxBunks = Math.floor((attendedClasses * 100) / targetPercentage - totalClasses);
  return Math.max(0, maxBunks);
}

/**
 * Calculates how many consecutive classes must be attended
 * to bring attendance back up to the target percentage.
 *
 * Formula: We need (attended + m) / (total + m) >= target / 100
 *   => m * (100 - target) >= target * total - attended * 100
 *   => m >= (target * total - attended * 100) / (100 - target)
 *   => classesNeeded = ceil((target * total - attended * 100) / (100 - target))
 *
 * Returns 0 if already at or above the target.
 * Returns Infinity if target is 100% and already missed any class.
 *
 * @param {number} totalClasses
 * @param {number} attendedClasses
 * @param {number} [targetPercentage=75]
 * @returns {number} Classes needed to attend consecutively, or 0
 */
export function calculateClassesToRecover(totalClasses, attendedClasses, targetPercentage = DEFAULT_TARGET_PERCENTAGE) {
  if (!Number.isFinite(totalClasses) || !Number.isFinite(attendedClasses) || !Number.isFinite(targetPercentage)) {
    return 0;
  }
  if (totalClasses <= 0 || attendedClasses < 0 || targetPercentage <= 0 || targetPercentage > 100) {
    return 0;
  }

  const currentPercentage = (attendedClasses / totalClasses) * 100;
  if (currentPercentage >= targetPercentage) {
    return 0; // Already at or above target
  }

  // If target is 100%, can never recover once a class is missed
  if (targetPercentage === 100) {
    return attendedClasses < totalClasses ? Infinity : 0;
  }

  const numerator = targetPercentage * totalClasses - attendedClasses * 100;
  const denominator = 100 - targetPercentage;

  return Math.ceil(numerator / denominator);
}

/**
 * Determines the attendance health status for a subject.
 *
 * @param {number} totalClasses
 * @param {number} attendedClasses
 * @param {number} [targetPercentage=75]
 * @returns {'on_track' | 'at_risk' | 'below_target' | 'no_data'}
 */
export function getAttendanceStatus(totalClasses, attendedClasses, targetPercentage = DEFAULT_TARGET_PERCENTAGE) {
  if (!Number.isFinite(totalClasses) || totalClasses <= 0) return 'no_data';
  if (!Number.isFinite(attendedClasses) || attendedClasses < 0) return 'no_data';

  const percentage = calculateAttendancePercentage(totalClasses, attendedClasses);

  if (percentage >= targetPercentage) return 'on_track';
  if (percentage >= targetPercentage - ATTENDANCE_THRESHOLDS.AT_RISK_MARGIN) return 'at_risk';
  return 'below_target';
}

/**
 * Builds a complete attendance summary for a subject from its records.
 *
 * @param {Array<{ status: string }>} records  - Attendance records for one subject
 * @param {number} [targetPercentage=75]
 * @returns {{
 *   totalClasses: number,
 *   attendedClasses: number,
 *   missedClasses: number,
 *   percentage: number,
 *   status: string,
 *   safeBunks: number,
 *   classesToRecover: number
 * }}
 */
/**
 * Builds a complete attendance summary for a subject from its records and optional baseline.
 *
 * Prevents double-counting: If baseline_as_of_date is provided, only individual
 * attendance records dated strictly AFTER baseline_as_of_date are added to the baseline.
 *
 * @param {Array<{ status: string, date?: string }>} records  - Attendance records for one subject
 * @param {number} [targetPercentage=75]
 * @param {object | null} [baseline=null] - { baseline_attended, baseline_total, baseline_as_of_date }
 * @returns {{
 *   totalClasses: number,
 *   attendedClasses: number,
 *   missedClasses: number,
 *   percentage: number,
 *   status: string,
 *   safeBunks: number,
 *   classesToRecover: number,
 *   baselineAttended: number,
 *   baselineTotal: number,
 *   subsequentClasses: number
 * }}
 */
export function buildAttendanceSummary(records = [], targetPercentage = DEFAULT_TARGET_PERCENTAGE, baseline = null) {
  const safeRecords = Array.isArray(records) ? records : [];

  let baseAttended = 0;
  let baseTotal = 0;
  let asOfDate = null;

  if (baseline && typeof baseline === 'object') {
    baseAttended = Math.max(0, Number(baseline.baseline_attended ?? baseline.attended ?? 0) || 0);
    baseTotal = Math.max(0, Number(baseline.baseline_total ?? baseline.total ?? 0) || 0);
    asOfDate = baseline.baseline_as_of_date ?? baseline.as_of_date ?? null;
  }

  // Filter records dated strictly after asOfDate to prevent double-counting
  const subsequentRecords = asOfDate
    ? safeRecords.filter((r) => r && r.date && r.date > asOfDate)
    : safeRecords;

  const subsequentAttended = subsequentRecords.filter((r) => r && r.status === 'present').length;
  const subsequentTotal = subsequentRecords.length;

  const totalClasses = baseTotal + subsequentTotal;
  const attendedClasses = baseAttended + subsequentAttended;
  const missedClasses = Math.max(0, totalClasses - attendedClasses);

  return {
    totalClasses,
    attendedClasses,
    missedClasses,
    percentage: calculateAttendancePercentage(totalClasses, attendedClasses),
    status: getAttendanceStatus(totalClasses, attendedClasses, targetPercentage),
    safeBunks: calculateSafeBunks(totalClasses, attendedClasses, targetPercentage),
    classesToRecover: calculateClassesToRecover(totalClasses, attendedClasses, targetPercentage),
    baselineAttended: baseAttended,
    baselineTotal: baseTotal,
    subsequentClasses: subsequentTotal,
  };
}

/**
 * Formats an attendance percentage for display (e.g. "78.50%").
 * Returns '—' if value cannot be calculated or if totalClasses is 0.
 *
 * @param {number|string} percentage
 * @param {number} [totalClasses]
 * @returns {string}
 */
export function formatAttendancePercentage(percentage, totalClasses) {
  if (totalClasses !== undefined && totalClasses !== null && Number(totalClasses) <= 0) {
    return '—';
  }
  const numeric = typeof percentage === 'number' ? percentage : parseFloat(percentage);
  if (!Number.isFinite(numeric)) return '—';
  return `${numeric.toFixed(2)}%`;
}

/**
 * Returns a human-readable label for an attendance status.
 *
 * @param {string} status
 * @returns {string}
 */
export function getAttendanceStatusLabel(status) {
  switch (status) {
    case 'on_track':
      return 'On Track';
    case 'at_risk':
      return 'At Risk';
    case 'below_target':
      return 'Below Target';
    case 'no_data':
      return 'No Data';
    default:
      return 'Unknown';
  }
}

/**
 * Groups attendance records by date, sorted chronologically (newest first).
 *
 * @param {Array<{ date: string, status: string }>} records
 * @returns {Array<{ date: string, entries: Array<{ status: string }> }>}
 */
export function groupRecordsByDate(records = []) {
  if (!Array.isArray(records)) return [];

  const map = new Map();
  for (const record of records) {
    if (!record || !record.date) continue;
    if (!map.has(record.date)) {
      map.set(record.date, []);
    }
    map.get(record.date).push(record);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // Newest first
    .map(([date, entries]) => ({ date, entries }));
}

/**
 * Calculates attendance streaks (consecutive present days).
 *
 * @param {Array<{ date: string, status: string }>} records  - Sorted oldest-first
 * @returns {{ currentStreak: number, longestStreak: number }}
 */
export function calculateStreaks(records = []) {
  if (!Array.isArray(records) || records.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Sort by date ascending
  const sorted = [...records]
    .filter((r) => r && r.date && r.status)
    .sort((a, b) => a.date.localeCompare(b.date));

  let currentStreak = 0;
  let longestStreak = 0;

  for (const record of sorted) {
    if (record.status === 'present') {
      currentStreak += 1;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return { currentStreak, longestStreak };
}
