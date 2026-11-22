/**
 * Mova Campus — Baseline Attendance Unit Tests
 *
 * Verifies:
 * - Baseline attendance input validation
 * - Non-negative attended and total constraints
 * - attended <= total constraint
 * - Date validation
 * - Prevention of double-counting: only records dated after as_of_date are added
 * - Safe bunk and recovery calculations combined with baseline
 */

import assert from 'node:assert';
import {
  buildAttendanceSummary,
  calculateAttendancePercentage,
  calculateClassesToRecover,
  calculateSafeBunks,
  validateBaselineAttendance,
  validateSubjectInput,
} from '../src/utils/attendance-validators.js';

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

console.log('--- Testing Baseline Attendance Validation ---');

test('Valid baseline attended and total accepted', () => {
  const result = validateBaselineAttendance({
    attended: 28,
    total: 35,
    as_of_date: '2026-10-15',
  });
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.sanitizedData.baseline_attended, 28);
  assert.strictEqual(result.sanitizedData.baseline_total, 35);
  assert.strictEqual(result.sanitizedData.baseline_as_of_date, '2026-10-15');
});

test('Attended exceeding total rejected', () => {
  const result = validateBaselineAttendance({
    attended: 40,
    total: 35,
  });
  assert.strictEqual(result.isValid, false);
  assert.ok(result.errors.baseline_attended.includes('cannot exceed'));
});

test('Negative attended rejected', () => {
  const result = validateBaselineAttendance({
    attended: -5,
    total: 30,
  });
  assert.strictEqual(result.isValid, false);
  assert.ok(result.errors.baseline_attended);
});

test('Negative total rejected', () => {
  const result = validateBaselineAttendance({
    attended: 10,
    total: -1,
  });
  assert.strictEqual(result.isValid, false);
  assert.ok(result.errors.baseline_total);
});

test('Zero classes baseline accepted (clean slate)', () => {
  const result = validateBaselineAttendance({
    attended: 0,
    total: 0,
  });
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.sanitizedData.baseline_attended, 0);
  assert.strictEqual(result.sanitizedData.baseline_total, 0);
});

test('Subject input includes baseline when provided', () => {
  const result = validateSubjectInput({
    name: 'Operating Systems',
    target_percentage: 75,
    baseline_attended: 30,
    baseline_total: 40,
    baseline_as_of_date: '2026-10-01',
  });
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.sanitizedData.baseline_attended, 30);
  assert.strictEqual(result.sanitizedData.baseline_total, 40);
  assert.strictEqual(result.sanitizedData.baseline_as_of_date, '2026-10-01');
});

console.log('\n--- Testing Baseline Attendance Combination (No Double Counting) ---');

test('Baseline without subsequent records computes correctly', () => {
  const baseline = { baseline_attended: 24, baseline_total: 30, baseline_as_of_date: '2026-10-01' };
  const summary = buildAttendanceSummary([], 75, baseline);
  assert.strictEqual(summary.totalClasses, 30);
  assert.strictEqual(summary.attendedClasses, 24);
  assert.strictEqual(summary.missedClasses, 6);
  assert.strictEqual(summary.percentage, 80);
  assert.strictEqual(summary.safeBunks, 2);
  assert.strictEqual(summary.classesToRecover, 0);
  assert.strictEqual(summary.status, 'on_track');
});

test('Records on or before baseline_as_of_date are excluded to prevent double counting', () => {
  const baseline = { baseline_attended: 20, baseline_total: 25, baseline_as_of_date: '2026-10-15' };
  const records = [
    { date: '2026-10-10', status: 'present' }, // should be ignored (prior to baseline)
    { date: '2026-10-15', status: 'present' }, // should be ignored (on baseline date)
    { date: '2026-10-16', status: 'present' }, // should be included
    { date: '2026-10-17', status: 'absent' },  // should be included
  ];
  const summary = buildAttendanceSummary(records, 75, baseline);
  assert.strictEqual(summary.baselineTotal, 25);
  assert.strictEqual(summary.baselineAttended, 20);
  assert.strictEqual(summary.subsequentClasses, 2);
  assert.strictEqual(summary.totalClasses, 27); // 25 + 2
  assert.strictEqual(summary.attendedClasses, 21); // 20 + 1
  assert.strictEqual(summary.missedClasses, 6);
});

test('Subsequent records after baseline correctly update safe bunks and recovery', () => {
  // Baseline 70% (14/20) at 75% target => below target
  const baseline = { baseline_attended: 14, baseline_total: 20, baseline_as_of_date: '2026-10-01' };
  const records = [
    { date: '2026-10-05', status: 'present' },
    { date: '2026-10-06', status: 'present' },
    { date: '2026-10-07', status: 'present' },
    { date: '2026-10-08', status: 'present' },
  ];
  // 14 + 4 = 18 attended, 20 + 4 = 24 total => 18/24 = 75% exactly
  const summary = buildAttendanceSummary(records, 75, baseline);
  assert.strictEqual(summary.totalClasses, 24);
  assert.strictEqual(summary.attendedClasses, 18);
  assert.strictEqual(summary.percentage, 75);
  assert.strictEqual(summary.status, 'on_track');
  assert.strictEqual(summary.classesToRecover, 0);
  assert.strictEqual(summary.safeBunks, 0);
});

console.log(`\nALL ${passed} BASELINE ATTENDANCE TESTS PASSED!`);
