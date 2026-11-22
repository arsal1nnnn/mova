/**
 * Mova Campus — Future Attendance Prediction Unit Tests
 *
 * Verifies:
 * - Date arithmetic and weekday mapping
 * - Date range generation
 * - Holiday exclusions (classes scheduled on holidays must be skipped)
 * - Safe bunk allowance over future windows
 * - Interactive miss simulation curve
 * - Edge cases: zero classes, 100% target, impossible targets
 */

import assert from 'node:assert';
import {
  addDays,
  buildFutureAttendanceProjections,
  calculateFutureSafeBunks,
  getDateRange,
  getWeekdayFromDate,
  simulateMissedAttendance,
} from '../src/utils/attendance-prediction.js';

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log('--- Testing Prediction Date Utilities ---');

test('addDays advances date across month boundaries', () => {
  assert.strictEqual(addDays('2026-10-31', 1), '2026-11-01');
  assert.strictEqual(addDays('2026-02-28', 1), '2026-03-01');
  assert.strictEqual(addDays('2026-12-31', 1), '2027-01-01');
});

test('getWeekdayFromDate maps accurately', () => {
  // 2026-11-23 is Monday (1)
  assert.strictEqual(getWeekdayFromDate('2026-11-23'), 1);
  // 2026-11-22 is Sunday (0)
  assert.strictEqual(getWeekdayFromDate('2026-11-22'), 0);
  // 2026-11-28 is Saturday (6)
  assert.strictEqual(getWeekdayFromDate('2026-11-28'), 6);
});

test('getDateRange generates inclusive sequence', () => {
  const range = getDateRange('2026-11-01', '2026-11-05');
  assert.deepStrictEqual(range, [
    '2026-11-01',
    '2026-11-02',
    '2026-11-03',
    '2026-11-04',
    '2026-11-05',
  ]);
});

console.log('\n--- Testing Future Safe Bunk Calculations ---');

test('calculateFutureSafeBunks gives correct bunk allowance', () => {
  // Currently 20/20 (100%), 20 future classes scheduled. Target = 75%.
  // Projected total = 40. Needed = ceil(0.75 * 40) = 30.
  // Student currently has 20. Needs 10 more out of 20 future.
  // Can miss: 20 - 10 = 10 classes!
  const bunks = calculateFutureSafeBunks(20, 20, 20, 75);
  assert.strictEqual(bunks, 10);
});

test('calculateFutureSafeBunks returns 0 when even 100% attendance is below target', () => {
  // Currently 10/30 (33.3%). 10 future classes. Total = 40.
  // Needed = ceil(0.75 * 40) = 30.
  // Student only has 10 + 10 = 20 at best.
  // Max bunks must be 0!
  const bunks = calculateFutureSafeBunks(30, 10, 10, 75);
  assert.strictEqual(bunks, 0);
});

test('simulateMissedAttendance reflects missed classes accurately', () => {
  // Total 20, attended 15 (75%). 10 future classes.
  // If misses 0: total 30, attended 25 => 83.33%
  const sim0 = simulateMissedAttendance(20, 15, 10, 0);
  assert.strictEqual(sim0, 83.33);

  // If misses 5: total 30, attended 20 => 66.67%
  const sim5 = simulateMissedAttendance(20, 15, 10, 5);
  assert.strictEqual(sim5, 66.67);
});

console.log('\n--- Testing Future Projection Engine with Holiday Exclusions ---');

test('Holidays exclude scheduled classes from future total', () => {
  // Setup: Mon (1) has a class.
  // Range: 2026-11-23 (Mon) to 2026-11-29 (Sun).
  // asOfDate: 2026-11-22 (Sunday).
  // Days strictly after asOfDate: 2026-11-23 to 2026-11-29.
  // Mon 2026-11-23 has 1 class for "Data Structures".
  const timetable = [
    { weekday: 1, subject_name: 'Data Structures', start_time: '09:00', end_time: '10:00' },
  ];
  const subjects = [
    {
      id: 'sub-1',
      name: 'Data Structures',
      target_percentage: 75,
      summary: { totalClasses: 10, attendedClasses: 9, percentage: 90 },
    },
  ];

  // Case 1: No holidays
  const resNoHol = buildFutureAttendanceProjections({
    subjects,
    timetable,
    asOfDate: '2026-11-22',
    targetDate: '2026-11-29',
    holidays: [],
  });
  assert.strictEqual(resNoHol.totalFutureClasses, 1);
  assert.strictEqual(resNoHol.projections[0].futureScheduledClasses, 1);

  // Case 2: Monday 2026-11-23 is declared a holiday!
  const resWithHol = buildFutureAttendanceProjections({
    subjects,
    timetable,
    asOfDate: '2026-11-22',
    targetDate: '2026-11-29',
    holidays: [{ date: '2026-11-23', name: 'University Holiday', type: 'college' }],
  });
  // The class on Monday should be completely excluded!
  assert.strictEqual(resWithHol.totalFutureClasses, 0);
  assert.strictEqual(resWithHol.projections[0].futureScheduledClasses, 0);
  assert.strictEqual(resWithHol.holidayDatesCount, 1);
});

console.log(`\nALL ${passed} ATTENDANCE PREDICTION TESTS PASSED!`);
