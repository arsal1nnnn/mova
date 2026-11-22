/**
 * Mova Campus — OCR Parsing & Import Validation Unit Tests
 *
 * Verifies:
 * - Parsing attendance report text formats (slash, tabular, key-value)
 * - Automatic recalculation of exact attendance percentage
 * - Header row filtering
 * - Rejection/flagging of attended > total
 * - Time string normalization (12-hour AM/PM to 24-hour HH:MM)
 * - Timetable text parsing (day headers, time ranges, rooms, subject names)
 */

import assert from 'node:assert';
import {
  normalizeTimeString,
  parseAttendanceReportText,
  parseTimetableText,
} from '../src/utils/ocr-parser.js';

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

console.log('--- Testing Attendance Report OCR Text Parsing ---');

test('Parses slash format with printed percentage', () => {
  const text = `
    ATTENDANCE REPORT 2026
    Mathematics: 28 / 35 (80%)
    Physics: 24 / 30
  `;
  const results = parseAttendanceReportText(text);
  assert.strictEqual(results.length, 2);

  assert.strictEqual(results[0].name, 'Mathematics');
  assert.strictEqual(results[0].attended, 28);
  assert.strictEqual(results[0].total, 35);
  assert.strictEqual(results[0].calculatedPercentage, 80);
  assert.strictEqual(results[0].isValid, true);

  assert.strictEqual(results[1].name, 'Physics');
  assert.strictEqual(results[1].attended, 24);
  assert.strictEqual(results[1].total, 30);
  assert.strictEqual(results[1].calculatedPercentage, 80);
});

test('Parses tabular space-separated format', () => {
  const text = `
    Subject Attended Total Percentage
    DataStructures 32 40 80.0%
    ComputerNetworks 25 30 83.33%
  `;
  const results = parseAttendanceReportText(text);
  assert.strictEqual(results.length, 2);
  assert.strictEqual(results[0].name, 'DataStructures');
  assert.strictEqual(results[0].attended, 32);
  assert.strictEqual(results[0].total, 40);
  assert.strictEqual(results[0].calculatedPercentage, 80);
});

test('Parses key-value attendance format', () => {
  const text = `
    Operating Systems - Attended: 18, Total: 20
  `;
  const results = parseAttendanceReportText(text);
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].name, 'Operating Systems');
  assert.strictEqual(results[0].attended, 18);
  assert.strictEqual(results[0].total, 20);
  assert.strictEqual(results[0].calculatedPercentage, 90);
});

test('Flags attended exceeding total as invalid', () => {
  const text = 'Chemistry: 35 / 30';
  const results = parseAttendanceReportText(text);
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].isValid, false);
  assert.ok(results[0].error.includes('cannot exceed'));
});

console.log('\n--- Testing Time Normalization ---');

test('normalizeTimeString handles 12-hour AM/PM and 24-hour formats', () => {
  assert.strictEqual(normalizeTimeString('09:00 AM'), '09:00');
  assert.strictEqual(normalizeTimeString('9:30 AM'), '09:30');
  assert.strictEqual(normalizeTimeString('12:00 PM'), '12:00');
  assert.strictEqual(normalizeTimeString('2:15 PM'), '14:15');
  assert.strictEqual(normalizeTimeString('14:30'), '14:30');
  assert.strictEqual(normalizeTimeString('00:00'), '00:00');
});

console.log('\n--- Testing Timetable OCR Text Parsing ---');

test('Parses day header and time range with subject and room', () => {
  const text = `
    Monday
    09:00 - 10:30 Data Structures Room 301
    11:00 - 12:30 Database Systems Lab 2
  `;
  const results = parseTimetableText(text);
  assert.strictEqual(results.length, 2);

  assert.strictEqual(results[0].weekday, 1);
  assert.strictEqual(results[0].start_time, '09:00');
  assert.strictEqual(results[0].end_time, '10:30');
  assert.strictEqual(results[0].subject_name, 'Data Structures');
  assert.strictEqual(results[0].room, 'Room 301');

  assert.strictEqual(results[1].weekday, 1);
  assert.strictEqual(results[1].start_time, '11:00');
  assert.strictEqual(results[1].end_time, '12:30');
  assert.strictEqual(results[1].room, 'Lab 2');
});

test('Parses inline day format', () => {
  const text = 'Tue 10:00 AM - 11:30 AM Algorithms LH-1';
  const results = parseTimetableText(text);
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].weekday, 2);
  assert.strictEqual(results[0].start_time, '10:00');
  assert.strictEqual(results[0].end_time, '11:30');
  assert.strictEqual(results[0].subject_name, 'Algorithms');
  assert.strictEqual(results[0].room, 'LH-1');
});

console.log(`\nALL ${passed} OCR & IMPORT VALIDATION TESTS PASSED!`);
