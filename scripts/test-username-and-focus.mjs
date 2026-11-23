/**
 * Test Suite: Username Validation, Focus Mode, Timetable Conflicts & CSV Parsing
 */

import assert from 'node:assert';
import {
  validateUsername,
  generateSuggestedUsername,
} from '../src/utils/profile-validators.js';
import {
  detectTimetableConflicts,
  parseCsvAttendance,
} from '../src/utils/ocr-parser.js';
import {
  formatAttendancePercentage,
  calculateAttendancePercentage,
} from '../src/utils/attendance-validators.js';

console.log('--- RUNNING USERNAME, FOCUS, CONFLICT & CSV TESTS ---');

// 1. Strict Username Validation
console.log('Test 1: Strict username validation (/^[a-z0-9]{3,20}$/)');
{
  // Valid usernames
  const v1 = validateUsername('student123');
  assert.strictEqual(v1.isValid, true);
  assert.strictEqual(v1.sanitizedValue, 'student123');

  const v2 = validateUsername('alex');
  assert.strictEqual(v2.isValid, true);

  // Auto-lowercase transformation
  const v3 = validateUsername('AlexMorgan');
  assert.strictEqual(v3.isValid, true);
  assert.strictEqual(v3.sanitizedValue, 'alexmorgan');
  assert.strictEqual(v3.wasTransformed, true);

  // Invalid: too short
  const vShort = validateUsername('ab');
  assert.strictEqual(vShort.isValid, false);
  assert(vShort.error.includes('at least 3 characters'));

  // Invalid: too long
  const vLong = validateUsername('a'.repeat(25));
  assert.strictEqual(vLong.isValid, false);
  assert(vLong.error.includes('cannot exceed 20 characters'));

  // Invalid: hyphens or underscores not allowed
  const vHyphen = validateUsername('alex-morgan');
  assert.strictEqual(vHyphen.isValid, false);
  assert(vHyphen.error.includes('lowercase letters (a-z) and numbers (0-9)'));

  const vUnderscore = validateUsername('alex_morgan');
  assert.strictEqual(vUnderscore.isValid, false);
  assert(vUnderscore.error.includes('lowercase letters (a-z) and numbers (0-9)'));

  // Invalid: spaces or symbols
  const vSpace = validateUsername('alex morgan');
  assert.strictEqual(vSpace.isValid, false);

  const vSymbol = validateUsername('alex@123');
  assert.strictEqual(vSymbol.isValid, false);

  console.log('✓ Strict username validation passed.');
}

// 2. Username Suggestion Generator
console.log('Test 2: Username suggestion generator');
{
  const s1 = generateSuggestedUsername('Alex Morgan');
  assert(s1.startsWith('alexmorgan'));
  assert(/^[a-z0-9]{3,20}$/.test(s1));

  const s2 = generateSuggestedUsername('student.name@campus.edu');
  assert(s2.startsWith('studentname'));
  assert(/^[a-z0-9]{3,20}$/.test(s2));

  const s3 = generateSuggestedUsername('X');
  assert(s3.length >= 3);
  assert(/^[a-z0-9]{3,20}$/.test(s3));

  console.log('✓ Username suggestion generator passed.');
}

// 3. Timetable Overlap & Conflict Detection
console.log('Test 3: Timetable overlap & conflict detection');
{
  const testClasses = [
    { id: 'c1', subject_name: 'Physics', weekday: 1, start_time: '09:00', end_time: '10:30' },
    { id: 'c2', subject_name: 'Chemistry', weekday: 1, start_time: '10:00', end_time: '11:30' }, // Overlaps with c1!
    { id: 'c3', subject_name: 'Math', weekday: 1, start_time: '12:00', end_time: '13:00' }, // Disjoint
    { id: 'c4', subject_name: 'Biology', weekday: 2, start_time: '09:00', end_time: '10:30' }, // Different day
  ];

  const conflicts = detectTimetableConflicts(testClasses);
  assert.strictEqual(conflicts.length, 1);
  assert.strictEqual(conflicts[0].subjectA, 'Physics');
  assert.strictEqual(conflicts[0].subjectB, 'Chemistry');
  assert.strictEqual(conflicts[0].weekday, 1);
  assert(conflicts[0].message.includes('overlaps with'));

  // Disjoint schedule should have zero conflicts
  const nonOverlapping = [
    { id: 'c1', subject_name: 'Physics', weekday: 1, start_time: '09:00', end_time: '10:00' },
    { id: 'c2', subject_name: 'Chemistry', weekday: 1, start_time: '10:00', end_time: '11:00' },
  ];
  assert.strictEqual(detectTimetableConflicts(nonOverlapping).length, 0);

  console.log('✓ Timetable conflict detection passed.');
}

// 4. Attendance CSV Parsing
console.log('Test 4: Attendance CSV parser');
{
  const csvData = `Subject Name,Attended,Total,Percentage
Data Structures,28,35,80%
Operating Systems,30,40,75%
Mathematics,24,30,80%`;

  const parsed = parseCsvAttendance(csvData);
  assert.strictEqual(parsed.length, 3);
  assert.strictEqual(parsed[0].name, 'Data Structures');
  assert.strictEqual(parsed[0].attended, 28);
  assert.strictEqual(parsed[0].total, 35);
  assert.strictEqual(parsed[0].calculatedPercentage, 80);
  assert.strictEqual(parsed[0].isValid, true);

  // Tab-delimited without header
  const tsvData = `Physics\t20\t25
Chemistry\t18\t20`;
  const tsvParsed = parseCsvAttendance(tsvData);
  assert.strictEqual(tsvParsed.length, 2);
  assert.strictEqual(tsvParsed[0].name, 'Physics');
  assert.strictEqual(tsvParsed[0].attended, 20);
  assert.strictEqual(tsvParsed[0].total, 25);

  console.log('✓ Attendance CSV parser passed.');
}

// 5. Attendance Percentage Formatting Edge Cases
console.log('Test 5: Attendance percentage formatting (NaN and 0 classes)');
{
  assert.strictEqual(formatAttendancePercentage(NaN, 0), '—');
  assert.strictEqual(formatAttendancePercentage(null, 0), '—');
  assert.strictEqual(formatAttendancePercentage(undefined, 0), '—');
  assert.strictEqual(formatAttendancePercentage(0, 0), '—');
  assert.strictEqual(formatAttendancePercentage(80.4, 30), '80.40%');
  assert.strictEqual(formatAttendancePercentage(74.6, 30), '74.60%');
  assert.strictEqual(calculateAttendancePercentage(0, 0), 0);

  console.log('✓ Attendance percentage formatting passed.');
}

console.log('\nALL USERNAME, FOCUS, CONFLICT & CSV TESTS PASSED SUCCESSFULLY! 🎉\n');
