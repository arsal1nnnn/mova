/**
 * Mova Campus — Attendance Validation & Calculation Tests
 *
 * Tests all pure functions in src/utils/attendance-validators.js
 * Run: node ./scripts/test-attendance-validation.mjs
 */

import {
  validateSubjectName,
  validateTargetPercentage,
  validateSubjectInput,
  validateAttendanceStatus,
  validateAttendanceDate,
  validateAttendanceRecordInput,
  calculateAttendancePercentage,
  calculateSafeBunks,
  calculateClassesToRecover,
  getAttendanceStatus,
  buildAttendanceSummary,
  formatAttendancePercentage,
  getAttendanceStatusLabel,
  groupRecordsByDate,
  calculateStreaks,
  DEFAULT_TARGET_PERCENTAGE,
} from '../src/utils/attendance-validators.js';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed += 1;
    console.log(`PASS: ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL: ${label}`);
  }
}

// ===================================================================
// Subject Validation Tests
// ===================================================================
console.log('\n--- Testing Subject Name Validation ---');
assert(!validateSubjectName('').isValid, 'Empty name rejected');
assert(!validateSubjectName('   ').isValid, 'Whitespace name rejected');
assert(!validateSubjectName(123).isValid, 'Non-string name rejected');
assert(!validateSubjectName(null).isValid, 'null name rejected');
assert(!validateSubjectName('A'.repeat(101)).isValid, 'Name > 100 chars rejected');
assert(validateSubjectName('Data Structures').isValid, 'Valid name accepted');
assert(validateSubjectName('  Math  ').sanitizedValue === 'Math', 'Name trimmed');
assert(validateSubjectName('A'.repeat(100)).isValid, 'Name at exactly 100 chars accepted');

console.log('\n--- Testing Target Percentage Validation ---');
assert(validateTargetPercentage(75).isValid, '75% accepted');
assert(validateTargetPercentage(1).isValid, '1% accepted');
assert(validateTargetPercentage(100).isValid, '100% accepted');
assert(!validateTargetPercentage(0).isValid, '0% rejected');
assert(!validateTargetPercentage(101).isValid, '101% rejected');
assert(!validateTargetPercentage(-5).isValid, 'Negative rejected');
assert(!validateTargetPercentage(75.5).isValid, 'Non-integer rejected');
assert(validateTargetPercentage('80').isValid, 'String number accepted');
assert(validateTargetPercentage('80').sanitizedValue === 80, 'String parsed to number');
assert(validateTargetPercentage(null).isValid, 'null defaults to 75%');
assert(validateTargetPercentage(null).sanitizedValue === 75, 'null default value is 75');
assert(validateTargetPercentage(undefined).isValid, 'undefined defaults to 75%');

console.log('\n--- Testing Full Subject Input Validation ---');
{
  const valid = validateSubjectInput({ name: 'Physics', target_percentage: 80 });
  assert(valid.isValid, 'Valid subject accepted');
  assert(valid.sanitizedData.name === 'Physics', 'Subject name preserved');
  assert(valid.sanitizedData.target_percentage === 80, 'Target preserved');

  const defaults = validateSubjectInput({ name: 'Chemistry' });
  assert(defaults.isValid, 'Subject without target uses default');
  assert(defaults.sanitizedData.target_percentage === 75, 'Default target is 75%');

  const invalid = validateSubjectInput({ name: '', target_percentage: 200 });
  assert(!invalid.isValid, 'Invalid subject rejected');
  assert('name' in invalid.errors, 'Name error recorded');
  assert('target_percentage' in invalid.errors, 'Target error recorded');
}

// ===================================================================
// Attendance Record Validation Tests
// ===================================================================
console.log('\n--- Testing Attendance Status Validation ---');
assert(validateAttendanceStatus('present').isValid, 'present accepted');
assert(validateAttendanceStatus('absent').isValid, 'absent accepted');
assert(validateAttendanceStatus('Present').sanitizedValue === 'present', 'Case normalized');
assert(validateAttendanceStatus(' absent ').sanitizedValue === 'absent', 'Whitespace trimmed');
assert(!validateAttendanceStatus('late').isValid, 'late rejected');
assert(!validateAttendanceStatus('').isValid, 'Empty status rejected');
assert(!validateAttendanceStatus(123).isValid, 'Numeric status rejected');

console.log('\n--- Testing Attendance Date Validation ---');
assert(validateAttendanceDate('2026-01-15').isValid, 'Valid past date accepted');
assert(validateAttendanceDate('2026-11-21').isValid, 'Today accepted');
assert(!validateAttendanceDate('2030-01-01').isValid, 'Far future date rejected');
assert(!validateAttendanceDate('not-a-date').isValid, 'Non-date string rejected');
assert(!validateAttendanceDate('2026-02-30').isValid, 'Invalid calendar date rejected');
assert(!validateAttendanceDate('2026-13-01').isValid, 'Month 13 rejected');
assert(!validateAttendanceDate(20261121).isValid, 'Numeric date rejected');
assert(validateAttendanceDate('2026-02-28').isValid, 'Feb 28 accepted');
assert(!validateAttendanceDate('2025-02-29').isValid, 'Feb 29 non-leap rejected');
assert(validateAttendanceDate('2024-02-29').isValid, 'Feb 29 leap year accepted');

console.log('\n--- Testing Attendance Record Input Validation ---');
{
  const valid = validateAttendanceRecordInput({
    subject_id: 'abc-123-def',
    date: '2026-10-15',
    status: 'present',
  });
  assert(valid.isValid, 'Valid record accepted');
  assert(valid.sanitizedData.status === 'present', 'Status preserved');
  assert(valid.sanitizedData.date === '2026-10-15', 'Date preserved');

  const noSubject = validateAttendanceRecordInput({ date: '2026-10-15', status: 'present' });
  assert(!noSubject.isValid, 'Missing subject_id rejected');
  assert('subject_id' in noSubject.errors, 'Subject ID error recorded');

  const defaults = validateAttendanceRecordInput({ subject_id: 'x', date: '2026-10-15' });
  assert(defaults.isValid, 'Missing status defaults to present');
  assert(defaults.sanitizedData.status === 'present', 'Default status is present');
}

// ===================================================================
// Attendance Calculation Tests
// ===================================================================
console.log('\n--- Testing Attendance Percentage ---');
assert(calculateAttendancePercentage(100, 75) === 75, '75 of 100 = 75%');
assert(calculateAttendancePercentage(100, 100) === 100, '100 of 100 = 100%');
assert(calculateAttendancePercentage(100, 0) === 0, '0 of 100 = 0%');
assert(calculateAttendancePercentage(3, 2) === 66.67, '2 of 3 = 66.67%');
assert(calculateAttendancePercentage(0, 0) === 0, '0 of 0 = 0%');
assert(calculateAttendancePercentage(-1, 5) === 0, 'Negative total = 0%');
assert(calculateAttendancePercentage(10, -1) === 0, 'Negative attended = 0%');
assert(calculateAttendancePercentage(10, 15) === 100, 'Attended > total capped at 100%');
assert(calculateAttendancePercentage(null, 5) === 0, 'null total = 0%');

console.log('\n--- Testing Safe Bunk Calculations ---');
// 80 attended out of 100, target 75%
// safeBunks = floor((80*100/75) - 100) = floor(106.67 - 100) = floor(6.67) = 6
assert(calculateSafeBunks(100, 80, 75) === 6, '80/100 at 75% target: can bunk 6');

// 75 of 100, target 75%
// safeBunks = floor((75*100/75) - 100) = floor(100 - 100) = 0
assert(calculateSafeBunks(100, 75, 75) === 0, '75/100 at 75% target: can bunk 0');

// 70 of 100, target 75% — already below
assert(calculateSafeBunks(100, 70, 75) === 0, '70/100 below target: cannot bunk');

// 10 of 10, target 75%
// safeBunks = floor((10*100/75) - 10) = floor(13.33 - 10) = 3
assert(calculateSafeBunks(10, 10, 75) === 3, '10/10 at 75% target: can bunk 3');

// 9 of 10, target 75%
// safeBunks = floor((9*100/75) - 10) = floor(12 - 10) = 2
assert(calculateSafeBunks(10, 9, 75) === 2, '9/10 at 75% target: can bunk 2');

// Edge: 0 total classes
assert(calculateSafeBunks(0, 0, 75) === 0, '0 total: cannot bunk');

// Edge: target 100%
assert(calculateSafeBunks(10, 10, 100) === 0, 'Target 100%: can never bunk');

// Verify safeBunks math: after bunking, should still be >= target
{
  const total = 20;
  const attended = 18;
  const target = 75;
  const bunks = calculateSafeBunks(total, attended, target);
  const afterPercentage = (attended / (total + bunks)) * 100;
  assert(afterPercentage >= target, `After ${bunks} bunks, ${afterPercentage.toFixed(1)}% >= ${target}%`);
  // And bunking one more should drop below
  const overPercentage = (attended / (total + bunks + 1)) * 100;
  assert(overPercentage < target, `After ${bunks + 1} bunks, ${overPercentage.toFixed(1)}% < ${target}%`);
}

console.log('\n--- Testing Classes to Recover ---');
// 60 of 100, target 75%
// m >= (75*100 - 60*100) / (100 - 75) = (7500 - 6000) / 25 = 1500/25 = 60
assert(calculateClassesToRecover(100, 60, 75) === 60, '60/100 at 75%: need 60 classes');

// 70 of 100, target 75%
// m >= (7500 - 7000) / 25 = 500 / 25 = 20
assert(calculateClassesToRecover(100, 70, 75) === 20, '70/100 at 75%: need 20 classes');

// Already above target — no recovery needed
assert(calculateClassesToRecover(100, 80, 75) === 0, '80/100 at 75%: already above');
assert(calculateClassesToRecover(100, 75, 75) === 0, '75/100 at 75%: exactly on target');

// Edge: target 100% with missed classes
assert(calculateClassesToRecover(10, 9, 100) === Infinity, '9/10 at 100%: impossible to recover');

// Edge: 0 total
assert(calculateClassesToRecover(0, 0, 75) === 0, '0 total: no recovery needed');

// Verify recovery math: after attending m more, should be >= target
{
  const total = 50;
  const attended = 30;
  const target = 75;
  const needed = calculateClassesToRecover(total, attended, target);
  const afterPercentage = ((attended + needed) / (total + needed)) * 100;
  assert(afterPercentage >= target, `After ${needed} classes, ${afterPercentage.toFixed(1)}% >= ${target}%`);
}

console.log('\n--- Testing Attendance Status ---');
assert(getAttendanceStatus(100, 80, 75) === 'on_track', '80% on track');
assert(getAttendanceStatus(100, 75, 75) === 'on_track', '75% exactly on target');
assert(getAttendanceStatus(100, 70, 75) === 'at_risk', '70% at risk (within 10 of 75)');
assert(getAttendanceStatus(100, 66, 75) === 'at_risk', '66% at risk (within 10 of 75)');
assert(getAttendanceStatus(100, 65, 75) === 'at_risk', '65% at risk (exactly 10 below)');
assert(getAttendanceStatus(100, 64, 75) === 'below_target', '64% below target');
assert(getAttendanceStatus(100, 50, 75) === 'below_target', '50% below target');
assert(getAttendanceStatus(0, 0, 75) === 'no_data', '0 total is no_data');
assert(getAttendanceStatus(-1, 5, 75) === 'no_data', 'Negative total is no_data');

console.log('\n--- Testing Build Attendance Summary ---');
{
  const records = [
    { status: 'present' },
    { status: 'present' },
    { status: 'absent' },
    { status: 'present' },
  ];
  const summary = buildAttendanceSummary(records, 75);
  assert(summary.totalClasses === 4, 'Total classes = 4');
  assert(summary.attendedClasses === 3, 'Attended = 3');
  assert(summary.missedClasses === 1, 'Missed = 1');
  assert(summary.percentage === 75, 'Percentage = 75%');
  assert(summary.status === 'on_track', 'Status is on_track');
  assert(summary.safeBunks === 0, '75% exactly: 0 safe bunks');
  assert(summary.classesToRecover === 0, 'On target: 0 classes to recover');

  const empty = buildAttendanceSummary([], 75);
  assert(empty.totalClasses === 0, 'Empty records: 0 total');
  assert(empty.status === 'no_data', 'Empty records: no_data');

  const notArray = buildAttendanceSummary(null, 75);
  assert(notArray.totalClasses === 0, 'null records handled');
}

console.log('\n--- Testing Format & Labels ---');
assert(formatAttendancePercentage(75) === '75.00%', '75 formats as 75.00%');
assert(formatAttendancePercentage(66.6667) === '66.67%', '66.6667 formats as 66.67%');
assert(formatAttendancePercentage(100) === '100.00%', '100 formats as 100.00%');
assert(formatAttendancePercentage(null) === '—', 'null formats as dash');
assert(formatAttendancePercentage(NaN) === '—', 'NaN formats as dash');

assert(getAttendanceStatusLabel('on_track') === 'On Track', 'on_track label');
assert(getAttendanceStatusLabel('at_risk') === 'At Risk', 'at_risk label');
assert(getAttendanceStatusLabel('below_target') === 'Below Target', 'below_target label');
assert(getAttendanceStatusLabel('no_data') === 'No Data', 'no_data label');
assert(getAttendanceStatusLabel('invalid') === 'Unknown', 'invalid label');

console.log('\n--- Testing Group Records by Date ---');
{
  const records = [
    { date: '2026-10-15', status: 'present' },
    { date: '2026-10-14', status: 'absent' },
    { date: '2026-10-15', status: 'absent' },
    { date: '2026-10-16', status: 'present' },
  ];
  const grouped = groupRecordsByDate(records);
  assert(grouped.length === 3, '3 unique dates');
  assert(grouped[0].date === '2026-10-16', 'Newest date first');
  assert(grouped[2].date === '2026-10-14', 'Oldest date last');
  assert(grouped[1].entries.length === 2, '2 entries for Oct 15');

  assert(groupRecordsByDate([]).length === 0, 'Empty records handled');
  assert(groupRecordsByDate(null).length === 0, 'null records handled');
}

console.log('\n--- Testing Attendance Streaks ---');
{
  const records = [
    { date: '2026-10-10', status: 'present' },
    { date: '2026-10-11', status: 'present' },
    { date: '2026-10-12', status: 'absent' },
    { date: '2026-10-13', status: 'present' },
    { date: '2026-10-14', status: 'present' },
    { date: '2026-10-15', status: 'present' },
  ];
  const streaks = calculateStreaks(records);
  assert(streaks.currentStreak === 3, 'Current streak = 3');
  assert(streaks.longestStreak === 3, 'Longest streak = 3');

  const allPresent = [
    { date: '2026-10-10', status: 'present' },
    { date: '2026-10-11', status: 'present' },
    { date: '2026-10-12', status: 'present' },
  ];
  assert(calculateStreaks(allPresent).currentStreak === 3, 'All present: streak 3');
  assert(calculateStreaks(allPresent).longestStreak === 3, 'All present: longest 3');

  const allAbsent = [
    { date: '2026-10-10', status: 'absent' },
    { date: '2026-10-11', status: 'absent' },
  ];
  assert(calculateStreaks(allAbsent).currentStreak === 0, 'All absent: streak 0');

  assert(calculateStreaks([]).currentStreak === 0, 'Empty: streak 0');
  assert(calculateStreaks(null).currentStreak === 0, 'null: streak 0');
}

// ===================================================================
// Summary
// ===================================================================
console.log(`\n${'='.repeat(50)}`);
if (failed === 0) {
  console.log(`ALL ${passed} ATTENDANCE TESTS PASSED!`);
} else {
  console.log(`${failed} TESTS FAILED out of ${passed + failed}`);
  process.exit(1);
}
