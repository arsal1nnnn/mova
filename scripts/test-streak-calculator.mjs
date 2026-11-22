/**
 * Mova Campus — Activity Streak Calculator Unit Tests
 *
 * Verifies:
 * - Activity extraction from tasks and attendance events
 * - Ignoring uncompleted tasks
 * - Correct streak continuation when active today
 * - Preserving streak if active yesterday (grace period until end of day)
 * - Break in streak when > 1 day gap
 * - Tracking historical longest streak
 */

import assert from 'node:assert';
import {
  calculateActivityStreak,
  extractActivityDates,
  getPreviousDay,
  toDateString,
} from '../src/utils/streak-calculator.js';

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

console.log('--- Testing Streak Date Helpers ---');

test('toDateString normalizes timestamps and date strings', () => {
  assert.strictEqual(toDateString('2026-11-22T08:30:00Z'), '2026-11-22');
  assert.strictEqual(toDateString('2026-11-22'), '2026-11-22');
  assert.strictEqual(toDateString(new Date(2026, 10, 22)), '2026-11-22');
  assert.strictEqual(toDateString(null), null);
});

test('getPreviousDay rolls back accurately', () => {
  assert.strictEqual(getPreviousDay('2026-11-01'), '2026-10-31');
  assert.strictEqual(getPreviousDay('2026-01-01'), '2025-12-31');
  assert.strictEqual(getPreviousDay('2026-03-01'), '2026-02-28');
});

console.log('\n--- Testing Activity Extraction ---');

test('extractActivityDates combines completed tasks and attendance records', () => {
  const tasks = [
    { id: '1', is_completed: true, completed_at: '2026-11-20T10:00:00Z' },
    { id: '2', is_completed: false, updated_at: '2026-11-21T10:00:00Z' }, // should be ignored (not completed)
    { id: '3', is_completed: true, completed_at: '2026-11-22T12:00:00Z' },
  ];
  const attendanceRecords = [
    { date: '2026-11-21', status: 'present' },
    { date: '2026-11-22', status: 'absent' }, // class logged counts as active check-in
  ];

  const dates = extractActivityDates({ tasks, attendanceRecords });
  assert.deepStrictEqual(dates, ['2026-11-20', '2026-11-21', '2026-11-22']);
});

console.log('\n--- Testing Streak Rules ---');

test('No activity yields 0 streaks', () => {
  const res = calculateActivityStreak([], '2026-11-22');
  assert.strictEqual(res.currentStreak, 0);
  assert.strictEqual(res.longestStreak, 0);
  assert.strictEqual(res.hasActivityToday, false);
});

test('Activity today gives current streak 1', () => {
  const res = calculateActivityStreak(['2026-11-22'], '2026-11-22');
  assert.strictEqual(res.currentStreak, 1);
  assert.strictEqual(res.longestStreak, 1);
  assert.strictEqual(res.hasActivityToday, true);
});

test('Activity yesterday preserves streak so far today', () => {
  // Today is 2026-11-22. Activity was logged on 2026-11-21, 2026-11-20.
  const res = calculateActivityStreak(['2026-11-20', '2026-11-21'], '2026-11-22');
  assert.strictEqual(res.currentStreak, 2);
  assert.strictEqual(res.hasActivityToday, false);
});

test('Continuous 4 day run computes current streak 4', () => {
  const dates = ['2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22'];
  const res = calculateActivityStreak(dates, '2026-11-22');
  assert.strictEqual(res.currentStreak, 4);
  assert.strictEqual(res.longestStreak, 4);
});

test('Broken streak preserves past best streak', () => {
  // Run of 5 days, gap of 3 days, then active today
  const dates = [
    '2026-11-01',
    '2026-11-02',
    '2026-11-03',
    '2026-11-04',
    '2026-11-05',
    '2026-11-22',
  ];
  const res = calculateActivityStreak(dates, '2026-11-22');
  assert.strictEqual(res.currentStreak, 1);
  assert.strictEqual(res.longestStreak, 5);
});

console.log(`\nALL ${passed} STREAK CALCULATOR TESTS PASSED!`);
