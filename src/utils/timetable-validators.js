/**
 * Mova Timetable Validation & Scheduling Utilities
 *
 * Pure, dependency-free helpers for weekly college class slots:
 * input validation, time-range checks, overlap detection, ordering,
 * current/upcoming status, and display formatting.
 *
 * Weekday convention matches JavaScript `Date#getDay()`:
 * 0 = Sunday … 6 = Saturday.
 */

export const WEEKDAYS = [
  { value: 1, label: 'Monday', short: 'Mon', initial: 'M' },
  { value: 2, label: 'Tuesday', short: 'Tue', initial: 'T' },
  { value: 3, label: 'Wednesday', short: 'Wed', initial: 'W' },
  { value: 4, label: 'Thursday', short: 'Thu', initial: 'T' },
  { value: 5, label: 'Friday', short: 'Fri', initial: 'F' },
  { value: 6, label: 'Saturday', short: 'Sat', initial: 'S' },
  { value: 0, label: 'Sunday', short: 'Sun', initial: 'S' },
];

export const WEEKDAY_VALUES = WEEKDAYS.map((day) => day.value);

export const TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export const MIN_CLASS_DURATION_MINUTES = 5;
export const MAX_CLASS_DURATION_MINUTES = 12 * 60;
export const MAX_SUBJECT_LENGTH = 100;
export const MAX_CLASS_TITLE_LENGTH = 120;
export const MAX_ROOM_LENGTH = 100;

/**
 * Returns weekday metadata for a numeric weekday.
 *
 * @param {number} weekday
 * @returns {{ value: number, label: string, short: string, initial: string } | null}
 */
export function getWeekdayMeta(weekday) {
  return WEEKDAYS.find((day) => day.value === weekday) ?? null;
}

/**
 * Returns the display label for a weekday (e.g. 1 -> "Monday").
 *
 * @param {number} weekday
 * @returns {string}
 */
export function getWeekdayLabel(weekday) {
  return getWeekdayMeta(weekday)?.label ?? 'Unknown day';
}

/**
 * Parses a 24-hour "HH:MM" time into minutes since midnight.
 *
 * @param {unknown} time
 * @returns {number | null} Minutes since midnight, or null if invalid
 */
export function timeToMinutes(time) {
  if (typeof time !== 'string') return null;

  // Accept "HH:MM" and tolerate accidental "HH:MM:SS" values from Postgres time columns
  const trimmed = time.trim().slice(0, 5);
  if (!TIME_PATTERN.test(trimmed)) return null;

  const [hours, minutes] = trimmed.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Converts minutes since midnight into "HH:MM".
 *
 * @param {number} minutes
 * @returns {string | null}
 */
export function minutesToTime(minutes) {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 24 * 60) return null;
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mins = String(minutes % 60).padStart(2, '0');
  return `${hours}:${mins}`;
}

/**
 * Validates a numeric weekday (0-6).
 *
 * @param {unknown} weekday
 * @returns {{ isValid: boolean, error: string | null, sanitizedValue: number | null }}
 */
export function validateWeekday(weekday) {
  const num = typeof weekday === 'string' && weekday.trim() !== '' ? Number(weekday) : weekday;

  if (typeof num !== 'number' || !Number.isInteger(num) || num < 0 || num > 6) {
    return {
      isValid: false,
      error: 'Weekday must be an integer from 0 (Sunday) to 6 (Saturday).',
      sanitizedValue: null,
    };
  }

  return { isValid: true, error: null, sanitizedValue: num };
}

/**
 * Validates a required subject name.
 *
 * @param {unknown} subjectName
 * @returns {{ isValid: boolean, error: string | null, sanitizedValue: string }}
 */
export function validateSubjectName(subjectName) {
  if (typeof subjectName !== 'string') {
    return { isValid: false, error: 'Subject name must be a text string.', sanitizedValue: '' };
  }

  const trimmed = subjectName.trim();
  if (trimmed.length < 1) {
    return { isValid: false, error: 'Subject name cannot be empty.', sanitizedValue: '' };
  }

  if (trimmed.length > MAX_SUBJECT_LENGTH) {
    return {
      isValid: false,
      error: `Subject name must be ${MAX_SUBJECT_LENGTH} characters or fewer.`,
      sanitizedValue: trimmed,
    };
  }

  return { isValid: true, error: null, sanitizedValue: trimmed };
}

/**
 * Validates a required class title.
 *
 * @param {unknown} title
 * @returns {{ isValid: boolean, error: string | null, sanitizedValue: string }}
 */
export function validateClassTitle(title) {
  if (typeof title !== 'string') {
    return { isValid: false, error: 'Class title must be a text string.', sanitizedValue: '' };
  }

  const trimmed = title.trim();
  if (trimmed.length < 1) {
    return { isValid: false, error: 'Class title cannot be empty.', sanitizedValue: '' };
  }

  if (trimmed.length > MAX_CLASS_TITLE_LENGTH) {
    return {
      isValid: false,
      error: `Class title must be ${MAX_CLASS_TITLE_LENGTH} characters or fewer.`,
      sanitizedValue: trimmed,
    };
  }

  return { isValid: true, error: null, sanitizedValue: trimmed };
}

/**
 * Validates an optional room / location label.
 *
 * @param {unknown} room
 * @returns {{ isValid: boolean, error: string | null, sanitizedValue: string | null }}
 */
export function validateRoom(room) {
  if (room === null || room === undefined || room === '') {
    return { isValid: true, error: null, sanitizedValue: null };
  }

  if (typeof room !== 'string') {
    return { isValid: false, error: 'Room must be a text string.', sanitizedValue: null };
  }

  const trimmed = room.trim();
  if (trimmed.length === 0) {
    return { isValid: true, error: null, sanitizedValue: null };
  }

  if (trimmed.length > MAX_ROOM_LENGTH) {
    return {
      isValid: false,
      error: `Room must be ${MAX_ROOM_LENGTH} characters or fewer.`,
      sanitizedValue: trimmed,
    };
  }

  return { isValid: true, error: null, sanitizedValue: trimmed };
}

/**
 * Validates a required 24-hour start/end time.
 *
 * @param {unknown} time
 * @param {string} [label='Time']
 * @returns {{ isValid: boolean, error: string | null, sanitizedValue: string }}
 */
export function validateClassTime(time, label = 'Time') {
  if (typeof time !== 'string') {
    return {
      isValid: false,
      error: `${label} must be a string in HH:MM format.`,
      sanitizedValue: '',
    };
  }

  const trimmed = time.trim().slice(0, 5);
  if (!TIME_PATTERN.test(trimmed)) {
    return {
      isValid: false,
      error: `${label} must be in 24-hour HH:MM format (e.g. 09:30).`,
      sanitizedValue: trimmed,
    };
  }

  return { isValid: true, error: null, sanitizedValue: trimmed };
}

/**
 * Validates that an end time is after the start time and that the
 * resulting class duration is realistic.
 *
 * @param {unknown} startTime
 * @param {unknown} endTime
 * @returns {{ isValid: boolean, error: string | null, durationMinutes: number | null }}
 */
export function validateTimeRange(startTime, endTime) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (start === null) {
    return { isValid: false, error: 'Start time must be in 24-hour HH:MM format.', durationMinutes: null };
  }

  if (end === null) {
    return { isValid: false, error: 'End time must be in 24-hour HH:MM format.', durationMinutes: null };
  }

  if (end <= start) {
    return {
      isValid: false,
      error: 'End time must be later than start time.',
      durationMinutes: null,
    };
  }

  const durationMinutes = end - start;

  if (durationMinutes < MIN_CLASS_DURATION_MINUTES) {
    return {
      isValid: false,
      error: `A class must last at least ${MIN_CLASS_DURATION_MINUTES} minutes.`,
      durationMinutes,
    };
  }

  if (durationMinutes > MAX_CLASS_DURATION_MINUTES) {
    return {
      isValid: false,
      error: `A class cannot last longer than ${MAX_CLASS_DURATION_MINUTES / 60} hours.`,
      durationMinutes,
    };
  }

  return { isValid: true, error: null, durationMinutes };
}

/**
 * Determines whether two class slots overlap.
 * Classes on different weekdays or merely touching (one ends exactly when
 * the other starts) never overlap.
 *
 * @param {{ weekday: number, start_time: string, end_time: string }} a
 * @param {{ weekday: number, start_time: string, end_time: string }} b
 * @returns {boolean}
 */
export function classesOverlap(a, b) {
  if (!a || !b) return false;
  if (Number(a.weekday) !== Number(b.weekday)) return false;

  const aStart = timeToMinutes(a.start_time);
  const aEnd = timeToMinutes(a.end_time);
  const bStart = timeToMinutes(b.start_time);
  const bEnd = timeToMinutes(b.end_time);

  if ([aStart, aEnd, bStart, bEnd].some((value) => value === null)) return false;

  return aStart < bEnd && bStart < aEnd;
}

/**
 * Finds existing classes that overlap a candidate slot.
 *
 * @param {{ weekday: number, start_time: string, end_time: string }} candidate
 * @param {Array<object>} existingClasses
 * @param {{ excludeId?: string | null }} [options]
 * @returns {Array<object>} Overlapping classes, ordered by start time
 */
export function findOverlappingClasses(candidate, existingClasses = [], { excludeId = null } = {}) {
  if (!Array.isArray(existingClasses)) return [];

  return existingClasses
    .filter((cls) => cls && cls.id !== excludeId && classesOverlap(candidate, cls))
    .sort((a, b) => (timeToMinutes(a.start_time) ?? 0) - (timeToMinutes(b.start_time) ?? 0));
}

/**
 * Builds a human-readable conflict message for a blocking class.
 *
 * @param {object} conflictingClass
 * @returns {string}
 */
export function describeConflict(conflictingClass) {
  const label = conflictingClass?.subject_name || conflictingClass?.title || 'another class';
  return `This slot overlaps "${label}" (${formatTimeRange(
    conflictingClass?.start_time,
    conflictingClass?.end_time
  )}).`;
}

/**
 * Validates a complete timetable class payload, including optional
 * overlap detection against the user's existing classes.
 *
 * @param {object} input
 * @param {{ existingClasses?: Array<object>, excludeId?: string | null }} [options]
 * @returns {{ isValid: boolean, errors: Record<string, string>, sanitizedData: object, conflicts: Array<object> }}
 */
export function validateClassInput(input = {}, { existingClasses = [], excludeId = null } = {}) {
  const errors = {};

  const subjectVal = validateSubjectName(input.subject_name);
  if (!subjectVal.isValid) errors.subject_name = subjectVal.error;

  const titleVal = validateClassTitle(input.title);
  if (!titleVal.isValid) errors.title = titleVal.error;

  const weekdayVal = validateWeekday(input.weekday);
  if (!weekdayVal.isValid) errors.weekday = weekdayVal.error;

  const startVal = validateClassTime(input.start_time, 'Start time');
  if (!startVal.isValid) errors.start_time = startVal.error;

  const endVal = validateClassTime(input.end_time, 'End time');
  if (!endVal.isValid) errors.end_time = endVal.error;

  const roomVal = validateRoom(input.room);
  if (!roomVal.isValid) errors.room = roomVal.error;

  let conflicts = [];

  if (!errors.start_time && !errors.end_time) {
    const rangeVal = validateTimeRange(startVal.sanitizedValue, endVal.sanitizedValue);
    if (!rangeVal.isValid) {
      errors.time = rangeVal.error;
    } else if (!errors.weekday && Array.isArray(existingClasses)) {
      conflicts = findOverlappingClasses(
        {
          weekday: weekdayVal.sanitizedValue,
          start_time: startVal.sanitizedValue,
          end_time: endVal.sanitizedValue,
        },
        existingClasses,
        { excludeId }
      );

      if (conflicts.length > 0) {
        errors.time = describeConflict(conflicts[0]);
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData: {
      subject_name: subjectVal.sanitizedValue,
      title: titleVal.sanitizedValue,
      weekday: weekdayVal.sanitizedValue,
      start_time: startVal.sanitizedValue,
      end_time: endVal.sanitizedValue,
      room: roomVal.sanitizedValue,
    },
    conflicts,
  };
}

/**
 * Sorts classes chronologically by start time.
 *
 * @param {Array<object>} classes
 * @param {'asc' | 'desc'} [order='asc']
 * @returns {Array<object>}
 */
export function sortClassesByTime(classes = [], order = 'asc') {
  if (!Array.isArray(classes)) return [];

  const direction = order === 'desc' ? -1 : 1;

  return [...classes].sort((a, b) => {
    const aStart = timeToMinutes(a?.start_time) ?? Number.MAX_SAFE_INTEGER;
    const bStart = timeToMinutes(b?.start_time) ?? Number.MAX_SAFE_INTEGER;
    if (aStart !== bStart) return (aStart - bStart) * direction;

    const aEnd = timeToMinutes(a?.end_time) ?? Number.MAX_SAFE_INTEGER;
    const bEnd = timeToMinutes(b?.end_time) ?? Number.MAX_SAFE_INTEGER;
    if (aEnd !== bEnd) return (aEnd - bEnd) * direction;

    return String(a?.subject_name ?? '').localeCompare(String(b?.subject_name ?? ''));
  });
}

/**
 * Returns the classes for a given weekday in chronological order.
 *
 * @param {Array<object>} classes
 * @param {number} weekday
 * @returns {Array<object>}
 */
export function getClassesForWeekday(classes = [], weekday) {
  if (!Array.isArray(classes)) return [];
  return sortClassesByTime(
    classes.filter((cls) => Number(cls?.weekday) === Number(weekday))
  );
}

/**
 * Groups classes into a Monday-first weekly schedule in chronological order.
 *
 * @param {Array<object>} classes
 * @returns {Array<{ weekday: number, label: string, short: string, classes: Array<object> }>}
 */
export function getWeekSchedule(classes = []) {
  return WEEKDAYS.map((day) => ({
    weekday: day.value,
    label: day.label,
    short: day.short,
    classes: getClassesForWeekday(classes, day.value),
  }));
}

/**
 * Returns the weekday index for a Date, matching the stored 0-6 convention.
 *
 * @param {Date} [date=new Date()]
 * @returns {number}
 */
export function getWeekdayFromDate(date = new Date()) {
  const day = date?.getDay?.();
  return typeof day === 'number' ? day : new Date().getDay();
}

/**
 * Returns today's classes in chronological order.
 *
 * @param {Array<object>} classes
 * @param {Date} [now=new Date()]
 * @returns {Array<object>}
 */
export function getTodayClasses(classes = [], now = new Date()) {
  return getClassesForWeekday(classes, getWeekdayFromDate(now));
}

/**
 * Returns the scheduling status of a class relative to `now`.
 *
 * @param {object} cls
 * @param {Date} [now=new Date()]
 * @returns {'upcoming' | 'ongoing' | 'ended'}
 */
export function getClassStatus(cls, now = new Date()) {
  const start = timeToMinutes(cls?.start_time);
  const end = timeToMinutes(cls?.end_time);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (start === null || end === null) return 'upcoming';
  if (nowMinutes >= end) return 'ended';
  if (nowMinutes >= start) return 'ongoing';
  return 'upcoming';
}

/**
 * Returns the next classes that have not started yet, searching today and
 * then the following six days. Powers the "up next" lists on Home.
 *
 * @param {Array<object>} classes
 * @param {Date} [now=new Date()]
 * @param {number} [limit=5]
 * @returns {Array<{ class: object, dayOffset: number, date: Date }>}
 */
export function getUpcomingClasses(classes = [], now = new Date(), limit = 5) {
  if (!Array.isArray(classes) || limit <= 0) return [];

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const upcoming = [];

  for (let dayOffset = 0; dayOffset < 7 && upcoming.length < limit; dayOffset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
    const dayClasses = getClassesForWeekday(classes, date.getDay());

    for (const cls of dayClasses) {
      const start = timeToMinutes(cls.start_time);
      if (start === null) continue;
      if (dayOffset === 0 && start <= nowMinutes) continue;

      upcoming.push({ class: cls, dayOffset, date });
      if (upcoming.length >= limit) break;
    }
  }

  return upcoming;
}

/**
 * Formats "HH:MM" as a 12-hour clock label (e.g. "2:30 PM").
 *
 * @param {string} time
 * @returns {string}
 */
export function formatTime12h(time) {
  const minutes = timeToMinutes(time);
  if (minutes === null) return '—';

  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const suffix = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  return `${hours12}:${String(mins).padStart(2, '0')} ${suffix}`;
}

/**
 * Formats a start/end pair (e.g. "9:00 AM – 10:30 AM").
 *
 * @param {string} startTime
 * @param {string} endTime
 * @returns {string}
 */
export function formatTimeRange(startTime, endTime) {
  return `${formatTime12h(startTime)} – ${formatTime12h(endTime)}`;
}

/**
 * Formats a duration in minutes (e.g. "1h 30m").
 *
 * @param {number} minutes
 * @returns {string}
 */
export function formatDurationLabel(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Returns the duration of a class in minutes, or null when invalid.
 *
 * @param {object} cls
 * @returns {number | null}
 */
export function getClassDurationMinutes(cls) {
  const start = timeToMinutes(cls?.start_time);
  const end = timeToMinutes(cls?.end_time);
  if (start === null || end === null || end <= start) return null;
  return end - start;
}

/**
 * Formats a class's duration from its start/end times.
 *
 * @param {object} cls
 * @returns {string}
 */
export function formatClassDuration(cls) {
  const duration = getClassDurationMinutes(cls);
  return duration === null ? '' : formatDurationLabel(duration);
}
