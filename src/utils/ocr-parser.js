/**
 * Mova Campus — OCR Text Parsing Engine
 *
 * Deterministic text extraction and parsing for:
 * 1. Attendance reports (tabular, key-value, and slash-separated formats).
 * 2. Weekly timetable schedules (day headers, time ranges, subject blocks).
 *
 * All extraction validates numbers and recalculates exact percentages
 * without trusting printed values.
 */

import {
  calculateAttendancePercentage,
  validateBaselineAttendance,
  validateSubjectName,
} from './attendance-validators.js';
import { validateTimeRange } from './timetable-validators.js';

const WEEKDAY_NAMES_MAP = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

/**
 * Parses raw text extracted from an attendance report image into structured subject rows.
 *
 * Supported formats:
 * - "Data Structures: 28 / 35 (80%)"
 * - "Operating Systems | 30 | 40 | 75.0%"
 * - "Mathematics    Attended: 24   Total: 30"
 * - "CS201  20  25"
 *
 * @param {string} rawText
 * @returns {Array<{ name: string, attended: number, total: number, calculatedPercentage: number, isValid: boolean, error?: string }>}
 */
export function parseAttendanceReportText(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results = [];

  // Common patterns for attendance lines
  // 1. "Name: Attended / Total" or "Name 28 / 35"
  const slashPattern = /^([A-Za-z0-9\s&._-]+?)[:|\t,-]\s*(\d+)\s*\/\s*(\d+)/;
  // 2. Tabular row: "SubjectName [attended] [total]"
  const tablePattern = /^([A-Za-z0-9\s&._-]{3,}?)\s+(\d{1,3})\s+(\d{1,3})(?:\s+(\d{1,3}(?:\.\d+)?%?))?$/;
  // 3. Key-value: "Subject ... Attended: X ... Total: Y"
  const kvPattern = /^(.+?)\s*[-:|,]?\s*attended[:\s]+(\d+).*?total[:\s]+(\d+)/i;

  for (const line of lines) {
    // Ignore header rows
    if (
      /^(subject|course|sl\.?no|s\.no|sr\.no|total|attendance report|student name|register)/i.test(line) &&
      !line.includes('/') &&
      !/\d{2}/.test(line)
    ) {
      continue;
    }

    let name = '';
    let attended = 0;
    let total = 0;
    let matched = false;

    const slashMatch = line.match(slashPattern);
    if (slashMatch) {
      name = slashMatch[1].trim();
      attended = parseInt(slashMatch[2], 10);
      total = parseInt(slashMatch[3], 10);
      matched = true;
    }

    if (!matched) {
      const kvMatch = line.match(kvPattern);
      if (kvMatch) {
        name = kvMatch[1].trim();
        attended = parseInt(kvMatch[2], 10);
        total = parseInt(kvMatch[3], 10);
        matched = true;
      }
    }

    if (!matched) {
      const tableMatch = line.match(tablePattern);
      if (tableMatch) {
        name = tableMatch[1].trim();
        attended = parseInt(tableMatch[2], 10);
        total = parseInt(tableMatch[3], 10);
        matched = true;
      }
    }

    if (matched && name.length >= 2) {
      const nameVal = validateSubjectName(name);
      const baseVal = validateBaselineAttendance({ attended, total });

      const isValid = nameVal.isValid && baseVal.isValid;
      const error = !nameVal.isValid
        ? nameVal.error
        : !baseVal.isValid
        ? Object.values(baseVal.errors)[0]
        : null;

      results.push({
        name: nameVal.sanitizedValue || name,
        attended,
        total,
        calculatedPercentage: calculateAttendancePercentage(total, attended),
        isValid,
        error: error || undefined,
      });
    }
  }

  return results;
}

/**
 * Normalizes time strings like "9:00", "09:00 AM", "2:30 PM", "14:30" to "HH:MM" (24h).
 *
 * @param {string} rawTime
 * @returns {string | null}
 */
export function normalizeTimeString(rawTime) {
  if (!rawTime) return null;
  const trimmed = rawTime.trim();

  // Match HH:MM with optional AM/PM
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*([APap][Mm]))?/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridian = match[3]?.toUpperCase();

  if (meridian === 'PM' && hours < 12) hours += 12;
  if (meridian === 'AM' && hours === 12) hours = 0;

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Parses raw text extracted from a timetable image into structured class entries.
 *
 * Supports patterns like:
 * - "Monday 09:00 - 10:30 Data Structures Room 301"
 * - "Tue | 11:00 AM - 12:30 PM | Physics | Lab 2"
 * - "Wednesday: 14:00 to 15:30 Chemistry"
 *
 * @param {string} rawText
 * @returns {Array<{ subject_name: string, title?: string, weekday: number, start_time: string, end_time: string, room?: string, isValid: boolean, error?: string }>}
 */
export function parseTimetableText(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results = [];

  let currentWeekday = 1; // default Monday if day header is found above

  // Time range pattern: "09:00 - 10:30" or "9:00 AM - 10:30 AM" or "09:00 to 10:30"
  const timeRangeRegex = /(\d{1,2}:\d{2}(?:\s*[APap][Mm])?)\s*(?:-|–|to)\s*(\d{1,2}:\d{2}(?:\s*[APap][Mm])?)/i;

  for (const line of lines) {
    // Check if line is purely a weekday header, e.g. "Monday" or "=== TUESDAY ==="
    const dayWordMatch = line.toLowerCase().match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/);
    const timeMatch = line.match(timeRangeRegex);

    if (dayWordMatch && !timeMatch) {
      currentWeekday = WEEKDAY_NAMES_MAP[dayWordMatch[1]] ?? currentWeekday;
      continue;
    }

    if (timeMatch) {
      let lineWeekday = currentWeekday;
      if (dayWordMatch) {
        lineWeekday = WEEKDAY_NAMES_MAP[dayWordMatch[1]] ?? currentWeekday;
      }

      const rawStart = timeMatch[1];
      const rawEnd = timeMatch[2];
      const startTime = normalizeTimeString(rawStart);
      const endTime = normalizeTimeString(rawEnd);

      // Remaining text after removing the time and day
      let remaining = line.replace(timeMatch[0], '').replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/gi, '').trim();

      // Check for room patterns, e.g. "Room 204", "LH-1", "Lab 3"
      let room = null;
      const roomMatch = remaining.match(/(?:room|lh|lab|hall|lt)\s*[-:]?\s*([A-Za-z0-9_-]+)/i);
      if (roomMatch) {
        room = roomMatch[0].trim();
        remaining = remaining.replace(roomMatch[0], '').trim();
      }

      // Cleanup remaining text to get subject name
      const subjectName = remaining
        .replace(/^[|:\s,-]+|[|:\s,-]+$/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

      if (subjectName.length >= 2 && startTime && endTime) {
        const timeVal = validateTimeRange(startTime, endTime);
        const isValid = timeVal.isValid;

        results.push({
          subject_name: subjectName,
          title: subjectName,
          weekday: lineWeekday,
          start_time: startTime,
          end_time: endTime,
          room: room || null,
          isValid,
          error: timeVal.error || undefined,
        });
      }
    }
  }

  return results;
}

/**
 * Parses attendance records from CSV content (comma, semicolon, or tab delimited).
 * Supports headers such as "Subject, Attended, Total" or "Course, Present, Held".
 *
 * @param {string} csvText
 * @returns {Array<{ name: string, attended: number, total: number, calculatedPercentage: number, isValid: boolean, error?: string }>}
 */
export function parseCsvAttendance(csvText) {
  if (!csvText || typeof csvText !== 'string') return [];

  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Determine delimiter from first line
  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) delimiter = '\t';
  else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';

  const results = [];
  let nameColIdx = 0;
  let attendedColIdx = 1;
  let totalColIdx = 2;
  let hasHeader = false;

  // Check header line
  const headerCols = firstLine.split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim().toLowerCase());
  const foundNameIdx = headerCols.findIndex((c) => /subject|course|name|title/i.test(c));
  const foundAttendedIdx = headerCols.findIndex((c) => /attended|present|attended_classes/i.test(c));
  const foundTotalIdx = headerCols.findIndex((c) => /total|held|total_classes|conducted/i.test(c));

  if (foundNameIdx !== -1 && (foundAttendedIdx !== -1 || foundTotalIdx !== -1)) {
    hasHeader = true;
    nameColIdx = foundNameIdx;
    attendedColIdx = foundAttendedIdx !== -1 ? foundAttendedIdx : 1;
    totalColIdx = foundTotalIdx !== -1 ? foundTotalIdx : 2;
  }

  const startLine = hasHeader ? 1 : 0;

  for (let i = startLine; i < lines.length; i++) {
    const rawLine = lines[i];
    const cols = rawLine.split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim());

    if (cols.length < 2) continue;

    const rawName = cols[nameColIdx] || '';
    const rawAttended = cols[attendedColIdx] || '';
    const rawTotal = cols[totalColIdx] || '';

    // Parse attended and total
    const attended = parseInt(rawAttended.replace(/[^0-9]/g, ''), 10);
    const total = parseInt(rawTotal.replace(/[^0-9]/g, ''), 10);

    if (rawName && Number.isFinite(attended) && Number.isFinite(total)) {
      const nameVal = validateSubjectName(rawName);
      const baseVal = validateBaselineAttendance({ attended, total });

      const isValid = nameVal.isValid && baseVal.isValid;
      const error = !nameVal.isValid
        ? nameVal.error
        : !baseVal.isValid
        ? Object.values(baseVal.errors)[0]
        : null;

      results.push({
        name: nameVal.sanitizedValue || rawName,
        attended,
        total,
        calculatedPercentage: calculateAttendancePercentage(total, attended),
        isValid,
        error: error || undefined,
      });
    }
  }

  return results;
}

/**
 * Detects overlapping schedule conflicts among timetable classes on the same weekday.
 *
 * @param {Array<{ id?: string, subject_name?: string, weekday: number, start_time: string, end_time: string }>} classes
 * @returns {Array<{ classIndexA: number, classIndexB: number, subjectA: string, subjectB: string, weekday: number, message: string }>}
 */
export function detectTimetableConflicts(classes = []) {
  if (!Array.isArray(classes) || classes.length < 2) return [];

  const toMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.trim().split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  };

  const conflicts = [];
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (let i = 0; i < classes.length; i++) {
    for (let j = i + 1; j < classes.length; j++) {
      const a = classes[i];
      const b = classes[j];

      const dayA = parseInt(a.weekday, 10);
      const dayB = parseInt(b.weekday, 10);

      if (dayA !== dayB) continue;

      const startA = toMinutes(a.start_time);
      const endA = toMinutes(a.end_time);
      const startB = toMinutes(b.start_time);
      const endB = toMinutes(b.end_time);

      if (startA === null || endA === null || startB === null || endB === null) continue;

      // Overlap condition: max(startA, startB) < min(endA, endB)
      if (Math.max(startA, startB) < Math.min(endA, endB)) {
        const nameA = a.subject_name || a.title || 'Class';
        const nameB = b.subject_name || b.title || 'Class';
        const dayName = DAY_NAMES[dayA] || `Day ${dayA}`;

        conflicts.push({
          classIndexA: i,
          classIndexB: j,
          idA: a.id,
          idB: b.id,
          subjectA: nameA,
          subjectB: nameB,
          weekday: dayA,
          message: `${nameA} (${a.start_time}–${a.end_time}) overlaps with ${nameB} (${b.start_time}–${b.end_time}) on ${dayName}.`,
        });
      }
    }
  }

  return conflicts;
}
