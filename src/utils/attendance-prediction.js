/**
 * Mova Campus — Future Attendance Prediction Engine
 *
 * Pure, deterministic mathematical calculations for projecting attendance
 * up to a future target date (such as final exams or semester conclusion).
 *
 * Integrates:
 * - Current baseline & recorded attendance.
 * - Weekly scheduled timetable.
 * - Public & college holiday calendar exclusions.
 * - Safe bunk allowance over the future window.
 * - Interactive class-miss simulation.
 */

import {
  calculateAttendancePercentage,
  calculateClassesToRecover,
  calculateSafeBunks,
  DEFAULT_TARGET_PERCENTAGE,
  getAttendanceStatus,
} from './attendance-validators.js';

/**
 * Returns date incremented by 1 day (YYYY-MM-DD).
 *
 * @param {string} dateStr
 * @returns {string}
 */
export function addDays(dateStr, days = 1) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Returns the weekday index (0 = Sunday, 1 = Monday, ..., 6 = Saturday) for YYYY-MM-DD.
 *
 * @param {string} dateStr
 * @returns {number}
 */
export function getWeekdayFromDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.getDay();
}

/**
 * Generates an array of date strings between startDate and endDate inclusive.
 *
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate   - YYYY-MM-DD
 * @returns {Array<string>}
 */
export function getDateRange(startDate, endDate) {
  if (!startDate || !endDate || startDate > endDate) return [];
  const dates = [];
  let curr = startDate;
  while (curr <= endDate) {
    dates.push(curr);
    curr = addDays(curr, 1);
  }
  return dates;
}

/**
 * Simulates future attendance percentage if the user misses N future classes.
 *
 * @param {number} currentTotal
 * @param {number} currentAttended
 * @param {number} futureClasses
 * @param {number} missedCount
 * @returns {number} Projected attendance percentage
 */
export function simulateMissedAttendance(currentTotal, currentAttended, futureClasses, missedCount) {
  const future = Math.max(0, futureClasses);
  const misses = Math.min(future, Math.max(0, missedCount));
  const futureAttended = future - misses;
  const projectedTotal = currentTotal + future;
  const projectedAttended = currentAttended + futureAttended;
  return calculateAttendancePercentage(projectedTotal, projectedAttended);
}

/**
 * Calculates maximum future classes that can be safely missed while still
 * finishing at or above the target percentage by the target date.
 *
 * @param {number} currentTotal
 * @param {number} currentAttended
 * @param {number} futureClasses
 * @param {number} targetPercentage
 * @returns {number}
 */
export function calculateFutureSafeBunks(currentTotal, currentAttended, futureClasses, targetPercentage = DEFAULT_TARGET_PERCENTAGE) {
  if (futureClasses <= 0) {
    return calculateSafeBunks(currentTotal, currentAttended, targetPercentage);
  }

  const projectedTotal = currentTotal + futureClasses;
  const requiredTotalAttended = Math.ceil((targetPercentage * projectedTotal) / 100);
  const futureAttendedNeeded = requiredTotalAttended - currentAttended;

  // Even attending all future classes is not enough to reach target
  if (futureAttendedNeeded > futureClasses) {
    return 0;
  }

  // Already have enough classes that even attending 0 future classes reaches target
  if (futureAttendedNeeded <= 0) {
    return futureClasses;
  }

  const maxBunks = futureClasses - futureAttendedNeeded;
  return Math.max(0, maxBunks);
}

/**
 * Builds comprehensive future attendance projections for all subjects.
 *
 * @param {object} params
 * @param {Array<object>} params.subjects         - Enriched subjects with summaries
 * @param {Array<object>} params.timetable        - Weekly class slots ({ weekday, subject_name, ... })
 * @param {string} params.asOfDate                - Starting date (YYYY-MM-DD), e.g. today
 * @param {string} params.targetDate              - Target future date (YYYY-MM-DD), e.g. exam date
 * @param {Array<object>} [params.holidays=[]]    - List of { date, name, type }
 * @param {number} [params.defaultTarget=75]      - Default target percentage
 * @returns {object}
 */
export function buildFutureAttendanceProjections({
  subjects = [],
  timetable = [],
  asOfDate,
  targetDate,
  holidays = [],
  defaultTarget = DEFAULT_TARGET_PERCENTAGE,
}) {
  if (!asOfDate || !targetDate || asOfDate >= targetDate) {
    return {
      projections: [],
      timeline: [],
      overallProjection: null,
      totalFutureClasses: 0,
      daysInRange: 0,
      holidayDatesCount: 0,
    };
  }

  const holidayMap = new Map();
  for (const h of holidays) {
    if (h && h.date) holidayMap.set(h.date, h);
  }

  // Timetable map by weekday -> classes
  const timetableByWeekday = new Map();
  for (let d = 0; d <= 6; d++) timetableByWeekday.set(d, []);
  for (const slot of timetable) {
    if (slot && Number.isInteger(slot.weekday) && timetableByWeekday.has(slot.weekday)) {
      timetableByWeekday.get(slot.weekday).push(slot);
    }
  }

  // Count scheduled future classes per subject
  // We iterate each day strictly AFTER asOfDate up to targetDate
  const startDate = addDays(asOfDate, 1);
  const dateRange = getDateRange(startDate, targetDate);

  const futureClassesBySubject = new Map();
  const timeline = [];

  for (const date of dateRange) {
    const isHoliday = holidayMap.has(date);
    const holidayInfo = isHoliday ? holidayMap.get(date) : null;
    const weekday = getWeekdayFromDate(date);
    const scheduledSlots = isHoliday ? [] : (timetableByWeekday.get(weekday) || []);

    timeline.push({
      date,
      weekday,
      isHoliday,
      holidayName: holidayInfo ? holidayInfo.name : null,
      holidayType: holidayInfo ? holidayInfo.type : null,
      classesCount: scheduledSlots.length,
      classes: scheduledSlots.map((s) => ({
        subject_name: s.subject_name,
        title: s.title,
        start_time: s.start_time,
        end_time: s.end_time,
        room: s.room,
      })),
    });

    if (!isHoliday) {
      for (const slot of scheduledSlots) {
        const key = slot.subject_name?.trim().toLowerCase();
        if (key) {
          futureClassesBySubject.set(key, (futureClassesBySubject.get(key) || 0) + 1);
        }
      }
    }
  }

  // Generate projections for each subject
  const projections = subjects.map((subject) => {
    const summary = subject.summary || {
      totalClasses: 0,
      attendedClasses: 0,
      percentage: 0,
      safeBunks: 0,
      classesToRecover: 0,
    };

    const target = subject.target_percentage || defaultTarget;
    const subjectKey = subject.name?.trim().toLowerCase();
    const futureClasses = futureClassesBySubject.get(subjectKey) || 0;

    const projectedTotal = summary.totalClasses + futureClasses;
    const projectedAttendedIfAll = summary.attendedClasses + futureClasses;
    const projectedPercentageIfAll = calculateAttendancePercentage(projectedTotal, projectedAttendedIfAll);

    const maxFutureSafeBunks = calculateFutureSafeBunks(
      summary.totalClasses,
      summary.attendedClasses,
      futureClasses,
      target
    );

    const minConsecutiveToRecover = calculateClassesToRecover(
      summary.totalClasses,
      summary.attendedClasses,
      target
    );

    // Classification
    let projectionStatus = 'on_track';
    if (projectedTotal === 0) {
      projectionStatus = 'no_data';
    } else if (projectedPercentageIfAll < target) {
      projectionStatus = 'below_target'; // Cannot even reach target if 100% attended
    } else if (summary.percentage < target) {
      projectionStatus = 'at_risk';
    }

    return {
      id: subject.id,
      name: subject.name,
      targetPercentage: target,
      currentSummary: summary,
      futureScheduledClasses: futureClasses,
      projectedTotal,
      projectedAttendedIfAll,
      projectedPercentageIfAll,
      maxFutureSafeBunks,
      minConsecutiveToRecover,
      projectionStatus,
      // Helper function to simulate misses
      simulateMisses: (misses) =>
        simulateMissedAttendance(summary.totalClasses, summary.attendedClasses, futureClasses, misses),
    };
  });

  // Overall aggregate projection
  const totalCurrentAttended = projections.reduce((acc, p) => acc + p.currentSummary.attendedClasses, 0);
  const totalCurrentTotal = projections.reduce((acc, p) => acc + p.currentSummary.totalClasses, 0);
  const totalFutureClasses = projections.reduce((acc, p) => acc + p.futureScheduledClasses, 0);
  const totalProjectedTotal = totalCurrentTotal + totalFutureClasses;
  const totalProjectedAttended = totalCurrentAttended + totalFutureClasses;

  const overallProjection = {
    currentPercentage: calculateAttendancePercentage(totalCurrentTotal, totalCurrentAttended),
    projectedPercentageIfAll: calculateAttendancePercentage(totalProjectedTotal, totalProjectedAttended),
    totalFutureClasses,
    totalSafeBunks: projections.reduce((acc, p) => acc + p.maxFutureSafeBunks, 0),
    totalClassesToRecover: projections.reduce((acc, p) => acc + p.minConsecutiveToRecover, 0),
    targetDate,
    asOfDate,
  };

  return {
    projections,
    timeline,
    overallProjection,
    totalFutureClasses,
    daysInRange: dateRange.length,
    holidayDatesCount: timeline.filter((t) => t.isHoliday).length,
  };
}
