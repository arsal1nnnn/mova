/**
 * Mova Task Validation & Recurrence Unit Tests
 *
 * Tests input validation boundaries, sanitization, and recurring date calculations.
 */

import assert from 'node:assert';
import {
  calculateNextDueDate,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_RECURRENCES,
  validateCategory,
  validateDueDate,
  validateDueTime,
  validateEstimatedDuration,
  validatePriority,
  validateRecurrence,
  validateTaskDescription,
  validateTaskInput,
  validateTaskTitle,
} from '../src/utils/task-validators.js';

console.log('--- Testing Task Title Validation ---');
{
  assert.strictEqual(validateTaskTitle('').isValid, false);
  assert.strictEqual(validateTaskTitle('   ').isValid, false);
  assert.strictEqual(validateTaskTitle(null).isValid, false);
  assert.strictEqual(validateTaskTitle(123).isValid, false);
  assert.strictEqual(validateTaskTitle('a'.repeat(201)).isValid, false);

  const valid = validateTaskTitle('  Complete Chem 101 Lab Report  ');
  assert.strictEqual(valid.isValid, true);
  assert.strictEqual(valid.sanitizedValue, 'Complete Chem 101 Lab Report');
  console.log('PASS: Title validation handles empty, non-string, length bounds, and trimming');
}

console.log('\n--- Testing Task Description Validation ---');
{
  assert.strictEqual(validateTaskDescription(null).sanitizedValue, null);
  assert.strictEqual(validateTaskDescription(undefined).sanitizedValue, null);
  assert.strictEqual(validateTaskDescription('').sanitizedValue, null);
  assert.strictEqual(validateTaskDescription('   ').sanitizedValue, null);
  assert.strictEqual(validateTaskDescription(123).isValid, false);
  assert.strictEqual(validateTaskDescription('x'.repeat(2001)).isValid, false);

  const valid = validateTaskDescription('Review chapters 4-6');
  assert.strictEqual(valid.isValid, true);
  assert.strictEqual(valid.sanitizedValue, 'Review chapters 4-6');
  console.log('PASS: Description handles null/empty, length bounds, and valid text');
}

console.log('\n--- Testing Due Date & Due Time Validation ---');
{
  assert.strictEqual(validateDueDate(null).sanitizedValue, null);
  assert.strictEqual(validateDueDate('not-a-date').isValid, false);
  assert.strictEqual(validateDueDate('2026-13-01').isValid, false); // Month 13
  assert.strictEqual(validateDueDate('2026-04-31').isValid, false); // April has 30 days
  assert.strictEqual(validateDueDate('2024-02-29').isValid, true);  // 2024 leap year Feb 29
  assert.strictEqual(validateDueDate('2025-02-29').isValid, false); // 2025 non-leap year Feb 29
  assert.strictEqual(validateDueDate('2026-10-26').isValid, true);

  assert.strictEqual(validateDueTime(null).sanitizedValue, null);
  assert.strictEqual(validateDueTime('24:00').isValid, false);
  assert.strictEqual(validateDueTime('12:60').isValid, false);
  assert.strictEqual(validateDueTime('2:30').isValid, false);
  assert.strictEqual(validateDueTime('00:00').isValid, true);
  assert.strictEqual(validateDueTime('14:30').isValid, true);
  console.log('PASS: Due date and time handle invalid calendars, leap years, and 24-hr format');
}

console.log('\n--- Testing Priority, Category, and Duration ---');
{
  TASK_PRIORITIES.forEach((p) => {
    assert.strictEqual(validatePriority(p).isValid, true);
    assert.strictEqual(validatePriority(p.toUpperCase()).sanitizedValue, p);
  });
  assert.strictEqual(validatePriority('extreme').isValid, false);
  assert.strictEqual(validatePriority(null).sanitizedValue, 'medium');

  TASK_CATEGORIES.forEach((c) => {
    assert.strictEqual(validateCategory(c).isValid, true);
    assert.strictEqual(validateCategory(c.toUpperCase()).sanitizedValue, c);
  });
  assert.strictEqual(validateCategory('gaming').isValid, false);
  assert.strictEqual(validateCategory(null).sanitizedValue, 'academic');

  assert.strictEqual(validateEstimatedDuration(null).sanitizedValue, null);
  assert.strictEqual(validateEstimatedDuration(0).isValid, false);
  assert.strictEqual(validateEstimatedDuration(1441).isValid, false);
  assert.strictEqual(validateEstimatedDuration(45.5).isValid, false);
  assert.strictEqual(validateEstimatedDuration(60).isValid, true);
  console.log('PASS: Priority, category, and estimated duration validated');
}

console.log('\n--- Testing Recurrence & Next Due Date Calculation ---');
{
  TASK_RECURRENCES.forEach((r) => {
    assert.strictEqual(validateRecurrence(r).isValid, true);
  });
  assert.strictEqual(validateRecurrence('hourly').isValid, false);
  assert.strictEqual(validateRecurrence(null).sanitizedValue, 'none');

  // Recurrence calculations
  assert.strictEqual(calculateNextDueDate('2026-10-26', 'none'), null);
  assert.strictEqual(calculateNextDueDate('2026-10-26', 'daily'), '2026-10-27');
  assert.strictEqual(calculateNextDueDate('2026-10-26', 'weekly'), '2026-11-02');

  // Weekdays: Friday 2026-10-30 advances to Monday 2026-11-02
  assert.strictEqual(calculateNextDueDate('2026-10-30', 'weekdays'), '2026-11-02');
  // Weekdays: Thursday 2026-10-29 advances to Friday 2026-10-30
  assert.strictEqual(calculateNextDueDate('2026-10-29', 'weekdays'), '2026-10-30');

  // Monthly: Jan 31 -> Feb 28 (non-leap year)
  assert.strictEqual(calculateNextDueDate('2026-01-31', 'monthly'), '2026-02-28');
  // Monthly: Jan 31 -> Feb 29 (leap year 2024)
  assert.strictEqual(calculateNextDueDate('2024-01-31', 'monthly'), '2024-02-29');

  console.log('PASS: Recurrence patterns compute expected next dates including weekend skip and month clamp');
}

console.log('\n--- Testing Full Task Input Validation ---');
{
  const validTask = {
    title: 'Study for Midterm Exam',
    description: 'Chapters 1 to 5 practice problems',
    due_date: '2026-11-15',
    due_time: '10:00',
    priority: 'high',
    category: 'academic',
    estimated_duration: 120,
    recurrence: 'weekly',
  };

  const result = validateTaskInput(validTask);
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.sanitizedData.title, 'Study for Midterm Exam');
  assert.strictEqual(result.sanitizedData.priority, 'high');
  assert.strictEqual(result.sanitizedData.estimated_duration, 120);

  const invalidTask = {
    title: '',
    due_date: 'invalid',
    due_time: '99:99',
    priority: 'invalid',
    estimated_duration: -10,
  };

  const invalidResult = validateTaskInput(invalidTask);
  assert.strictEqual(invalidResult.isValid, false);
  assert.ok(invalidResult.errors.title);
  assert.ok(invalidResult.errors.due_date);
  assert.ok(invalidResult.errors.due_time);
  assert.ok(invalidResult.errors.priority);
  assert.ok(invalidResult.errors.estimated_duration);
  console.log('PASS: Full task input validation succeeds for valid and catches multiple errors');
}

console.log('\nALL TASK VALIDATION TESTS PASSED!');
