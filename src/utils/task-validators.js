/**
 * Mova Task Validation and Recurrence Utilities
 *
 * Implements strict input validation, normalization, and calendar recurrence
 * calculation for task management records.
 */

import { getDaysInMonth } from './profile-validators.js';

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const TASK_CATEGORIES = ['academic', 'personal', 'work', 'health', 'other'];
export const TASK_RECURRENCES = ['none', 'daily', 'weekdays', 'weekly', 'monthly'];

const DUE_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DUE_TIME_REGEX = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 1440; // 24 hours

/**
 * Validates a task title string.
 *
 * @param {unknown} title
 * @returns {{ isValid: boolean, error: string | null, sanitizedValue: string }}
 */
export function validateTaskTitle(title) {
  if (typeof title !== 'string') {
    return {
      isValid: false,
      error: 'Task title must be a text string.',
      sanitizedValue: '',
    };
  }

  const trimmed = title.trim();
  if (trimmed.length < 1) {
    return {
      isValid: false,
      error: 'Task title cannot be empty.',
      sanitizedValue: '',
    };
  }

  if (trimmed.length > MAX_TITLE_LENGTH) {
    return {
      isValid: false,
      error: `Task title must be ${MAX_TITLE_LENGTH} characters or fewer.`,
      sanitizedValue: trimmed,
    };
  }

  return {
    isValid: true,
    error: null,
    sanitizedValue: trimmed,
  };
}

/**
 * Validates an optional task description.
 *
 * @param {unknown} description
 * @returns {{ isValid: boolean, error: string | null, sanitizedValue: string | null }}
 */
export function validateTaskDescription(description) {
  if (description === null || description === undefined || description === '') {
    return {
      isValid: true,
      error: null,
      sanitizedValue: null,
    };
  }

  if (typeof description !== 'string') {
    return {
      isValid: false,
      error: 'Task description must be a text string.',
      sanitizedValue: null,
    };
  }

  const trimmed = description.trim();
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    return {
      isValid: false,
      error: `Task description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.`,
      sanitizedValue: trimmed,
    };
  }

  return {
    isValid: true,
    error: null,
    sanitizedValue: trimmed.length > 0 ? trimmed : null,
  };
}

/**
 * Validates an optional calendar due date (YYYY-MM-DD).
 *
 * @param {unknown} dueDate
 * @returns {{ isValid: boolean, error: string | null, sanitizedValue: string | null }}
 */
export function validateDueDate(dueDate) {
  if (dueDate === null || dueDate === undefined || dueDate === '') {
    return {
      isValid: true,
      error: null,
      sanitizedValue: null,
    };
  }

  if (typeof dueDate !== 'string') {
    return {
      isValid: false,
      error: 'Due date must be a string in YYYY-MM-DD format.',
      sanitizedValue: null,
    };
  }

  const trimmed = dueDate.trim();
  if (!DUE_DATE_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: 'Due date must be in YYYY-MM-DD format.',
      sanitizedValue: trimmed,
    };
  }

  const [yearStr, monthStr, dayStr] = trimmed.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (year < 1900 || year > 2100) {
    return {
      isValid: false,
      error: 'Due date year must be between 1900 and 2100.',
      sanitizedValue: trimmed,
    };
  }

  if (month < 1 || month > 12) {
    return {
      isValid: false,
      error: 'Due date month must be between 01 and 12.',
      sanitizedValue: trimmed,
    };
  }

  const maxDays = getDaysInMonth(year, month);
  if (day < 1 || day > maxDays) {
    return {
      isValid: false,
      error: `Due date day must be between 01 and ${maxDays} for ${yearStr}-${monthStr}.`,
      sanitizedValue: trimmed,
    };
  }

  return {
    isValid: true,
    error: null,
    sanitizedValue: trimmed,
  };
}

/**
 * Validates an optional 24-hour due time (HH:MM).
 *
 * @param {unknown} dueTime
 * @returns {{ isValid: boolean, error: string | null, sanitizedValue: string | null }}
 */
export function validateDueTime(dueTime) {
  if (dueTime === null || dueTime === undefined || dueTime === '') {
    return {
      isValid: true,
      error: null,
      sanitizedValue: null,
    };
  }

  if (typeof dueTime !== 'string') {
    return {
      isValid: false,
      error: 'Due time must be a string in HH:MM format.',
      sanitizedValue: null,
    };
  }

  const trimmed = dueTime.trim();
  if (!DUE_TIME_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: 'Due time must be in 24-hour HH:MM format (e.g. 14:30).',
      sanitizedValue: trimmed,
    };
  }

  return {
    isValid: true,
    error: null,
    sanitizedValue: trimmed,
  };
}

/**
 * Validates task priority level.
 *
 * @param {unknown} priority
 * @returns {{ isValid: boolean, error: string | null, sanitizedValue: string }}
 */
export function validatePriority(priority) {
  if (priority === null || priority === undefined || priority === '') {
    return { isValid: true, error: null, sanitizedValue: 'medium' };
  }

  if (typeof priority !== 'string' || !TASK_PRIORITIES.includes(priority.toLowerCase().trim())) {
    return {
      isValid: false,
      error: `Priority must be one of: ${TASK_PRIORITIES.join(', ')}.`,
      sanitizedValue: 'medium',
    };
  }

  return {
    isValid: true,
    error: null,
    sanitizedValue: priority.toLowerCase().trim(),
  };
}

/**
 * Validates task category.
 *
 * @param {unknown} category
 * @returns {{ isValid: boolean, error: string | null, sanitizedValue: string }}
 */
export function validateCategory(category) {
  if (category === null || category === undefined || category === '') {
    return { isValid: true, error: null, sanitizedValue: 'academic' };
  }

  if (typeof category !== 'string' || !TASK_CATEGORIES.includes(category.toLowerCase().trim())) {
    return {
      isValid: false,
      error: `Category must be one of: ${TASK_CATEGORIES.join(', ')}.`,
      sanitizedValue: 'academic',
    };
  }

  return {
    isValid: true,
    error: null,
    sanitizedValue: category.toLowerCase().trim(),
  };
}

/**
 * Validates optional estimated duration in minutes.
 *
 * @param {unknown} duration
 * @returns {{ isValid: boolean, error: string | null, sanitizedValue: number | null }}
 */
export function validateEstimatedDuration(duration) {
  if (duration === null || duration === undefined || duration === '') {
    return { isValid: true, error: null, sanitizedValue: null };
  }

  const num = Number(duration);
  if (!Number.isInteger(num) || num < MIN_DURATION_MINUTES || num > MAX_DURATION_MINUTES) {
    return {
      isValid: false,
      error: `Estimated duration must be an integer between ${MIN_DURATION_MINUTES} and ${MAX_DURATION_MINUTES} minutes.`,
      sanitizedValue: null,
    };
  }

  return {
    isValid: true,
    error: null,
    sanitizedValue: num,
  };
}

/**
 * Validates recurrence pattern.
 *
 * @param {unknown} recurrence
 * @returns {{ isValid: boolean, error: string | null, sanitizedValue: string }}
 */
export function validateRecurrence(recurrence) {
  if (recurrence === null || recurrence === undefined || recurrence === '') {
    return { isValid: true, error: null, sanitizedValue: 'none' };
  }

  if (typeof recurrence !== 'string' || !TASK_RECURRENCES.includes(recurrence.toLowerCase().trim())) {
    return {
      isValid: false,
      error: `Recurrence must be one of: ${TASK_RECURRENCES.join(', ')}.`,
      sanitizedValue: 'none',
    };
  }

  return {
    isValid: true,
    error: null,
    sanitizedValue: recurrence.toLowerCase().trim(),
  };
}

/**
 * Calculates the next due date for recurring tasks.
 *
 * @param {string} currentDueDate - Due date in YYYY-MM-DD format
 * @param {'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly'} recurrence
 * @param {number} [interval=1]
 * @returns {string | null} Next due date in YYYY-MM-DD format, or null if recurrence is 'none'
 */
export function calculateNextDueDate(currentDueDate, recurrence, interval = 1) {
  if (!currentDueDate || recurrence === 'none' || !TASK_RECURRENCES.includes(recurrence)) {
    return null;
  }

  const match = currentDueDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // 0-indexed for Date constructor
  const day = parseInt(match[3], 10);

  const date = new Date(year, month, day);

  switch (recurrence) {
    case 'daily': {
      date.setDate(date.getDate() + interval);
      break;
    }
    case 'weekdays': {
      // Advance to next Monday-Friday
      do {
        date.setDate(date.getDate() + 1);
      } while (date.getDay() === 0 || date.getDay() === 6);
      break;
    }
    case 'weekly': {
      date.setDate(date.getDate() + 7 * interval);
      break;
    }
    case 'monthly': {
      const targetMonth = date.getMonth() + interval;
      const targetYear = date.getFullYear() + Math.floor(targetMonth / 12);
      const normalizedMonth = ((targetMonth % 12) + 12) % 12;
      const maxDaysInTarget = getDaysInMonth(targetYear, normalizedMonth + 1);
      const targetDay = Math.min(day, maxDaysInTarget);
      date.setFullYear(targetYear, normalizedMonth, targetDay);
      break;
    }
    default:
      return null;
  }

  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getDate()).padStart(2, '0');

  return `${nextYear}-${nextMonth}-${nextDay}`;
}

/**
 * Validates a complete task input payload.
 *
 * @param {Record<string, unknown>} input
 * @returns {{ isValid: boolean, errors: Record<string, string>, sanitizedData: object }}
 */
export function validateTaskInput(input = {}) {
  const errors = {};

  const titleVal = validateTaskTitle(input.title);
  if (!titleVal.isValid) {
    errors.title = titleVal.error;
  }

  const descVal = validateTaskDescription(input.description);
  if (!descVal.isValid) {
    errors.description = descVal.error;
  }

  const dueDateVal = validateDueDate(input.due_date);
  if (!dueDateVal.isValid) {
    errors.due_date = dueDateVal.error;
  }

  const dueTimeVal = validateDueTime(input.due_time);
  if (!dueTimeVal.isValid) {
    errors.due_time = dueTimeVal.error;
  }

  const priorityVal = validatePriority(input.priority);
  if (!priorityVal.isValid) {
    errors.priority = priorityVal.error;
  }

  const categoryVal = validateCategory(input.category);
  if (!categoryVal.isValid) {
    errors.category = categoryVal.error;
  }

  const durationVal = validateEstimatedDuration(input.estimated_duration);
  if (!durationVal.isValid) {
    errors.estimated_duration = durationVal.error;
  }

  const recurrenceVal = validateRecurrence(input.recurrence);
  if (!recurrenceVal.isValid) {
    errors.recurrence = recurrenceVal.error;
  }

  const sanitizedData = {
    title: titleVal.sanitizedValue,
    description: descVal.sanitizedValue,
    due_date: dueDateVal.sanitizedValue,
    due_time: dueTimeVal.sanitizedValue,
    priority: priorityVal.sanitizedValue,
    category: categoryVal.sanitizedValue,
    estimated_duration: durationVal.sanitizedValue,
    recurrence: recurrenceVal.sanitizedValue,
  };

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData,
  };
}
