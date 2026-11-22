/**
 * Mova Campus — Consistency Streak Calculator
 *
 * Computes genuine user consistency streaks based on actual user events:
 * 1. Completing a task (timestamped in task.completed_at or updated_at).
 * 2. Logging an attendance record (date of class occurrence or record entry).
 *
 * Streak rules:
 * - A day counts as active if >= 1 task was completed or >= 1 attendance record was logged.
 * - Current streak is continuous up to today (or yesterday, preserving the streak
 *   until the current day ends).
 * - Longest streak tracks the best consecutive active day run in history.
 * - No fake or hardcoded counters. Pure, testable logic.
 */

/**
 * Normalizes any timestamp or Date into YYYY-MM-DD string.
 *
 * @param {string | Date} val
 * @returns {string | null}
 */
export function toDateString(val) {
  if (!val) return null;
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return toDateString(parsed);
    }
  }
  return null;
}

/**
 * Decrements date by 1 day (YYYY-MM-DD).
 *
 * @param {string} dateStr
 * @returns {string}
 */
export function getPreviousDay(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Extracts and deduplicates unique activity dates from tasks and attendance records.
 *
 * @param {object} params
 * @param {Array<object>} [params.tasks=[]]
 * @param {Array<object>} [params.attendanceRecords=[]]
 * @returns {Array<string>} Sorted ascending
 */
export function extractActivityDates({ tasks = [], attendanceRecords = [] } = {}) {
  const dateSet = new Set();

  // Completed tasks
  if (Array.isArray(tasks)) {
    for (const task of tasks) {
      if (task && task.is_completed) {
        const rawDate = task.completed_at || task.updated_at || task.created_at;
        const ds = toDateString(rawDate);
        if (ds) dateSet.add(ds);
      }
    }
  }

  // Attendance records
  if (Array.isArray(attendanceRecords)) {
    for (const record of attendanceRecords) {
      if (record && record.date) {
        const ds = toDateString(record.date);
        if (ds) dateSet.add(ds);
      }
    }
  }

  return Array.from(dateSet).sort((a, b) => a.localeCompare(b));
}

/**
 * Calculates current streak and longest streak from a list of active dates.
 *
 * @param {Array<string>} activeDates - Array of YYYY-MM-DD strings
 * @param {Date | string} [now=new Date()] - Reference date
 * @returns {{ currentStreak: number, longestStreak: number, activeDaysCount: number, hasActivityToday: boolean, lastActiveDate: string | null }}
 */
export function calculateActivityStreak(activeDates = [], now = new Date()) {
  const todayStr = toDateString(now) || new Date().toISOString().slice(0, 10);
  const yesterdayStr = getPreviousDay(todayStr);

  const safeDates = Array.isArray(activeDates) ? activeDates.filter(Boolean) : [];
  if (safeDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      activeDaysCount: 0,
      hasActivityToday: false,
      lastActiveDate: null,
    };
  }

  const dateSet = new Set(safeDates);
  const sortedDates = Array.from(dateSet).sort((a, b) => a.localeCompare(b));
  const hasActivityToday = dateSet.has(todayStr);

  // Calculate current streak
  let currentStreak = 0;
  let checkDate = hasActivityToday ? todayStr : yesterdayStr;

  while (dateSet.has(checkDate)) {
    currentStreak++;
    checkDate = getPreviousDay(checkDate);
  }

  // Calculate longest streak across history
  let longestStreak = 0;
  let runningStreak = 0;
  let prevDate = null;

  for (const date of sortedDates) {
    if (!prevDate) {
      runningStreak = 1;
    } else {
      const expectedNext = getPreviousDay(date);
      if (prevDate === expectedNext) {
        runningStreak++;
      } else {
        runningStreak = 1;
      }
    }
    prevDate = date;
    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  return {
    currentStreak,
    longestStreak,
    activeDaysCount: dateSet.size,
    hasActivityToday,
    lastActiveDate: sortedDates[sortedDates.length - 1],
  };
}
