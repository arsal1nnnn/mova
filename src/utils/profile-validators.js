/**
 * Mova Profile Validation and Age Calculation Utilities
 *
 * Implements strict calendar-date age calculation and reusable
 * profile input validation without logging sensitive data.
 */

const DOB_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MIN_DOB_YEAR = 1900;
const MAX_NAME_LENGTH = 100;
const MAX_AVATAR_URL_LENGTH = 2048;

/**
 * Checks if a given year is a leap year in the Gregorian calendar.
 *
 * @param {number} year
 * @returns {boolean}
 */
export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns the maximum number of days in a given month and year.
 *
 * @param {number} year
 * @param {number} month (1-12)
 * @returns {number}
 */
export function getDaysInMonth(year, month) {
  switch (month) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

/**
 * Validates a user display name.
 *
 * @param {unknown} name
 * @returns {{ isValid: boolean, error: string | null, sanitizedValue: string }}
 */
export function validateDisplayName(name) {
  if (typeof name !== 'string') {
    return {
      isValid: false,
      error: 'Display name must be a text string.',
      sanitizedValue: '',
    };
  }

  const trimmed = name.trim();
  if (trimmed.length < 1) {
    return {
      isValid: false,
      error: 'Display name cannot be empty.',
      sanitizedValue: '',
    };
  }

  if (trimmed.length > MAX_NAME_LENGTH) {
    return {
      isValid: false,
      error: `Display name must be ${MAX_NAME_LENGTH} characters or fewer.`,
      sanitizedValue: trimmed,
    };
  }

  return {
    isValid: true,
    error: null,
    sanitizedValue: trimmed,
  };
}

/**
 * Validates a date of birth string in YYYY-MM-DD format.
 * Rejects impossible calendar dates, future dates, and years prior to 1900.
 *
 * @param {unknown} dobString
 * @param {Date} [referenceDate=new Date()]
 * @returns {{ isValid: boolean, error: string | null, sanitizedValue: string }}
 */
export function validateDateOfBirth(dobString, referenceDate = new Date()) {
  if (typeof dobString !== 'string') {
    return {
      isValid: false,
      error: 'Date of birth must be a string in YYYY-MM-DD format.',
      sanitizedValue: '',
    };
  }

  const trimmed = dobString.trim();
  if (!DOB_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: 'Date of birth must follow the format YYYY-MM-DD (e.g. 2004-05-18).',
      sanitizedValue: trimmed,
    };
  }

  const [yearStr, monthStr, dayStr] = trimmed.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12) {
    return {
      isValid: false,
      error: 'Date of birth contains an invalid month (must be 01-12).',
      sanitizedValue: trimmed,
    };
  }

  const maxDays = getDaysInMonth(year, month);
  if (day < 1 || day > maxDays) {
    return {
      isValid: false,
      error: `Date of birth day is invalid for month ${monthStr} (must be 01-${maxDays}).`,
      sanitizedValue: trimmed,
    };
  }

  if (year < MIN_DOB_YEAR) {
    return {
      isValid: false,
      error: `Date of birth year cannot be earlier than ${MIN_DOB_YEAR}.`,
      sanitizedValue: trimmed,
    };
  }

  // Check against reference date (reject future dates)
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1;
  const refDay = referenceDate.getDate();

  const isFuture =
    year > refYear ||
    (year === refYear && month > refMonth) ||
    (year === refYear && month === refMonth && day > refDay);

  if (isFuture) {
    return {
      isValid: false,
      error: 'Date of birth cannot be in the future.',
      sanitizedValue: trimmed,
    };
  }

  return {
    isValid: true,
    error: null,
    sanitizedValue: trimmed,
  };
}

/**
 * Validates an optional avatar URL or storage path reference.
 *
 * @param {unknown} avatarUrl
 * @returns {{ isValid: boolean, error: string | null, sanitizedValue: string | null }}
 */
export function validateAvatarUrl(avatarUrl) {
  if (avatarUrl === null || avatarUrl === undefined || avatarUrl === '') {
    return {
      isValid: true,
      error: null,
      sanitizedValue: null,
    };
  }

  if (typeof avatarUrl !== 'string') {
    return {
      isValid: false,
      error: 'Avatar reference must be a string.',
      sanitizedValue: null,
    };
  }

  const trimmed = avatarUrl.trim();
  if (trimmed.length > MAX_AVATAR_URL_LENGTH) {
    return {
      isValid: false,
      error: `Avatar reference cannot exceed ${MAX_AVATAR_URL_LENGTH} characters.`,
      sanitizedValue: trimmed,
    };
  }

  return {
    isValid: true,
    error: null,
    sanitizedValue: trimmed,
  };
}

/**
 * Calculates current calendar age from date of birth.
 * Uses exact calendar dates, avoiding fixed-day rounding errors.
 *
 * @param {string} dobString - Date of birth in YYYY-MM-DD format
 * @param {Date} [referenceDate=new Date()] - Reference date (defaults to today)
 * @returns {number | null} Age in years, or null if invalid
 */
export function calculateAge(dobString, referenceDate = new Date()) {
  if (!dobString || typeof dobString !== 'string') {
    return null;
  }

  const match = dobString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const dobYear = parseInt(match[1], 10);
  const dobMonth = parseInt(match[2], 10);
  const dobDay = parseInt(match[3], 10);

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1; // 1-indexed
  const refDay = referenceDate.getDate();

  let age = refYear - dobYear;

  // If the birthday has not yet occurred this calendar year, subtract 1
  if (refMonth < dobMonth || (refMonth === dobMonth && refDay < dobDay)) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

/**
 * Validates complete profile input payload.
 *
 * @param {{ name?: unknown, date_of_birth?: unknown, avatar_url?: unknown }} input
 * @param {Date} [referenceDate=new Date()]
 * @returns {{ isValid: boolean, errors: Record<string, string>, sanitizedData: { name: string, date_of_birth: string, avatar_url: string | null } }}
 */
export function validateProfileInput(input = {}, referenceDate = new Date()) {
  const errors = {};

  const nameValidation = validateDisplayName(input.name);
  if (!nameValidation.isValid) {
    errors.name = nameValidation.error;
  }

  const dobValidation = validateDateOfBirth(input.date_of_birth, referenceDate);
  if (!dobValidation.isValid) {
    errors.date_of_birth = dobValidation.error;
  }

  const avatarValidation = validateAvatarUrl(input.avatar_url);
  if (!avatarValidation.isValid) {
    errors.avatar_url = avatarValidation.error;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData: {
      name: nameValidation.sanitizedValue,
      date_of_birth: dobValidation.sanitizedValue,
      avatar_url: avatarValidation.sanitizedValue,
    },
  };
}
