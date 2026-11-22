/**
 * Mova Timetable Validation & Scheduling Unit Tests
 *
 * Covers class input validation, invalid time ranges, overlap detection,
 * chronological ordering, weekly grouping, status, and upcoming scheduling.
 * Runs in plain Node (no React Native imports).
 */

import {
  classesOverlap,
  describeConflict,
  findOverlappingClasses,
  formatClassDuration,
  formatDurationLabel,
  formatTime12h,
  formatTimeRange,
  getClassDurationMinutes,
  getClassStatus,
  getClassesForWeekday,
  getTodayClasses,
  getUpcomingClasses,
  getWeekSchedule,
  getWeekdayFromDate,
  minutesToTime,
  sortClassesByTime,
  timeToMinutes,
  validateClassInput,
  validateClassTime,
  validateClassTitle,
  validateRoom,
  validateSubjectName,
  validateTimeRange,
  validateWeekday,
  WEEKDAYS,
} from '../src/utils/timetable-validators.js';

let failures = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failures++;
  } else {
    console.log(`PASS: ${message}`);
  }
}

// Wednesday, 28 October 2026
const NOW = new Date(2026, 9, 28, 10, 15, 0);

const sampleClasses = [
  { id: 'wed-2', subject_name: 'Physics', title: 'Lab', weekday: 3, start_time: '11:00', end_time: '12:30', room: 'Lab 3' },
  { id: 'mon-1', subject_name: 'Math', title: 'Lecture', weekday: 1, start_time: '09:00', end_time: '10:00', room: null },
  { id: 'wed-1', subject_name: 'Data Structures', title: 'Lecture', weekday: 3, start_time: '09:00', end_time: '10:00', room: 'Room 204' },
  { id: 'fri-1', subject_name: 'English', title: 'Tutorial', weekday: 5, start_time: '14:00', end_time: '15:00', room: 'Block C' },
  { id: 'sun-1', subject_name: 'Art', title: 'Studio', weekday: 0, start_time: '20:00', end_time: '21:00', room: null },
  { id: 'thu-1', subject_name: 'Chemistry', title: 'Lecture', weekday: 4, start_time: '08:00', end_time: '09:30', room: 'Chem Hall' },
];

console.log('--- Testing Time Parsing & Formatting ---');
{
  assert(timeToMinutes('09:30') === 570, '09:30 parses to 570 minutes');
  assert(timeToMinutes('00:00') === 0, '00:00 parses to 0 minutes');
  assert(timeToMinutes('23:59') === 1439, '23:59 parses to 1439 minutes');
  assert(timeToMinutes('09:30:00') === 570, 'Postgres-style HH:MM:SS tolerated');
  assert(timeToMinutes('24:00') === null, '24:00 rejected');
  assert(timeToMinutes('9:30') === null, 'Single-digit hour rejected');
  assert(timeToMinutes('12:60') === null, 'Minute 60 rejected');
  assert(timeToMinutes(null) === null, 'null time rejected');
  assert(timeToMinutes(930) === null, 'numeric time rejected');

  assert(minutesToTime(570) === '09:30', '570 minutes renders 09:30');
  assert(minutesToTime(0) === '00:00', '0 minutes renders 00:00');
  assert(minutesToTime(1440) === '24:00', '1440 minutes renders 24:00');
  assert(minutesToTime(-5) === null, 'Negative minutes rejected');

  assert(formatTime12h('00:00') === '12:00 AM', 'Midnight formats as 12:00 AM');
  assert(formatTime12h('12:00') === '12:00 PM', 'Noon formats as 12:00 PM');
  assert(formatTime12h('14:30') === '2:30 PM', '14:30 formats as 2:30 PM');
  assert(formatTime12h('09:05') === '9:05 AM', '09:05 formats as 9:05 AM');
  assert(formatTime12h('bad') === '—', 'Invalid time shows placeholder');
  assert(formatTimeRange('09:00', '10:30') === '9:00 AM – 10:30 AM', 'Range formatting');

  assert(formatDurationLabel(45) === '45m', '45 minutes formats as 45m');
  assert(formatDurationLabel(90) === '1h 30m', '90 minutes formats as 1h 30m');
  assert(formatDurationLabel(120) === '2h', '120 minutes formats as 2h');
  assert(formatClassDuration(sampleClasses[0]) === '1h 30m', 'Class duration derived from times');
  assert(getClassDurationMinutes(sampleClasses[0]) === 90, 'Duration minutes computed');
}

console.log('\n--- Testing Weekday Validation ---');
{
  WEEKDAYS.forEach((day) => {
    assert(validateWeekday(day.value).isValid === true, `Weekday ${day.value} (${day.label}) valid`);
  });
  assert(validateWeekday('3').sanitizedValue === 3, 'Numeric string weekday sanitized');
  assert(validateWeekday(7).isValid === false, 'Weekday 7 rejected');
  assert(validateWeekday(-1).isValid === false, 'Weekday -1 rejected');
  assert(validateWeekday(2.5).isValid === false, 'Fractional weekday rejected');
  assert(validateWeekday(null).isValid === false, 'null weekday rejected');
  assert(WEEKDAYS[0].value === 1, 'Weekly ordering starts on Monday');
}

console.log('\n--- Testing Subject, Title & Room Validation ---');
{
  assert(validateSubjectName('').isValid === false, 'Empty subject rejected');
  assert(validateSubjectName('   ').isValid === false, 'Whitespace subject rejected');
  assert(validateSubjectName(null).isValid === false, 'Non-string subject rejected');
  assert(validateSubjectName('a'.repeat(101)).isValid === false, 'Subject longer than 100 rejected');
  assert(validateSubjectName('  Data Structures  ').sanitizedValue === 'Data Structures', 'Subject trimmed');

  assert(validateClassTitle('').isValid === false, 'Empty title rejected');
  assert(validateClassTitle('a'.repeat(121)).isValid === false, 'Title longer than 120 rejected');
  assert(validateClassTitle(' Lecture ').sanitizedValue === 'Lecture', 'Title trimmed');

  assert(validateRoom(null).sanitizedValue === null, 'null room allowed');
  assert(validateRoom('  ').sanitizedValue === null, 'Blank room becomes null');
  assert(validateRoom(' Room 204 ').sanitizedValue === 'Room 204', 'Room trimmed');
  assert(validateRoom('a'.repeat(101)).isValid === false, 'Room longer than 100 rejected');
  assert(validateClassTime('09:00', 'Start time').isValid === true, 'Zero-padded time valid');
  assert(validateClassTime('9:00', 'Start time').isValid === false, 'Unpadded time rejected');
}

console.log('\n--- Testing Invalid Time Ranges ---');
{
  assert(validateTimeRange('10:00', '10:00').isValid === false, 'Equal start/end rejected');
  assert(validateTimeRange('11:00', '10:00').isValid === false, 'Reversed range rejected');
  assert(validateTimeRange('10:00', '10:02').isValid === false, 'Duration below 5 minutes rejected');
  assert(validateTimeRange('08:00', '21:00').isValid === false, 'Duration above 12 hours rejected');
  assert(validateTimeRange('09:00', '10:30').isValid === true, 'Valid 90-minute range accepted');
  assert(validateTimeRange('09:00', '10:30').durationMinutes === 90, 'Duration reported correctly');
  assert(validateTimeRange('bad', '10:00').isValid === false, 'Malformed start rejected');
}

console.log('\n--- Testing Overlap Detection ---');
{
  const base = { weekday: 3, start_time: '09:00', end_time: '10:00' };

  assert(
    classesOverlap(base, { weekday: 3, start_time: '09:30', end_time: '10:30' }) === true,
    'Partially overlapping same-day classes detected'
  );
  assert(
    classesOverlap(base, { weekday: 3, start_time: '08:00', end_time: '09:01' }) === true,
    'Slight overlap detected'
  );
  assert(
    classesOverlap(base, { weekday: 3, start_time: '09:15', end_time: '09:45' }) === true,
    'Fully contained class detected'
  );
  assert(
    classesOverlap(base, { weekday: 3, start_time: '10:00', end_time: '11:00' }) === false,
    'Touching classes are not overlapping'
  );
  assert(
    classesOverlap(base, { weekday: 3, start_time: '08:00', end_time: '09:00' }) === false,
    'Class ending exactly at start is allowed'
  );
  assert(
    classesOverlap(base, { weekday: 4, start_time: '09:30', end_time: '10:30' }) === false,
    'Different weekdays never overlap'
  );
  assert(
    classesOverlap(base, { weekday: 3, start_time: 'invalid', end_time: '10:30' }) === false,
    'Invalid times never reported as overlap'
  );

  const conflicts = findOverlappingClasses(
    { weekday: 3, start_time: '10:30', end_time: '11:30' },
    sampleClasses
  );
  assert(conflicts.length === 1 && conflicts[0].id === 'wed-2', 'Conflict list finds only overlapping class');

  const selfUpdateConflicts = findOverlappingClasses(
    { weekday: 3, start_time: '09:00', end_time: '10:00' },
    sampleClasses,
    { excludeId: 'wed-1' }
  );
  assert(selfUpdateConflicts.length === 0, 'Class does not conflict with itself when excluded');

  assert(
    describeConflict(sampleClasses[0]).includes('Physics'),
    'Conflict message names the blocking class'
  );
}

console.log('\n--- Testing Full Class Input Validation ---');
{
  const valid = validateClassInput(
    {
      subject_name: '  Operating Systems ',
      title: ' Lecture ',
      weekday: 2,
      start_time: '09:00',
      end_time: '10:30',
      room: '  Room 12 ',
    },
    { existingClasses: sampleClasses }
  );

  assert(valid.isValid === true, 'Valid class input accepted');
  assert(valid.sanitizedData.subject_name === 'Operating Systems', 'Subject sanitized');
  assert(valid.sanitizedData.title === 'Lecture', 'Title sanitized');
  assert(valid.sanitizedData.room === 'Room 12', 'Room sanitized');
  assert(valid.sanitizedData.weekday === 2, 'Weekday preserved as number');

  const missing = validateClassInput({ subject_name: '', title: '', weekday: 9, start_time: '', end_time: '' });
  assert(missing.isValid === false, 'Missing required fields rejected');
  assert(Boolean(missing.errors.subject_name), 'Subject error recorded');
  assert(Boolean(missing.errors.title), 'Title error recorded');
  assert(Boolean(missing.errors.weekday), 'Weekday error recorded');
  assert(Boolean(missing.errors.start_time), 'Start time error recorded');
  assert(Boolean(missing.errors.end_time), 'End time error recorded');

  const inverted = validateClassInput({
    subject_name: 'Math',
    title: 'Lecture',
    weekday: 1,
    start_time: '12:00',
    end_time: '11:00',
  });
  assert(inverted.isValid === false, 'Inverted range rejected by full validation');
  assert(Boolean(inverted.errors.time), 'Time range error recorded');

  const overlapping = validateClassInput(
    {
      subject_name: 'Physics',
      title: 'Revision',
      weekday: 3,
      start_time: '09:30',
      end_time: '10:30',
    },
    { existingClasses: sampleClasses }
  );
  assert(overlapping.isValid === false, 'Overlapping class rejected');
  assert(overlapping.conflicts.length === 1, 'Overlap conflict reported');
  assert(
    overlapping.errors.time.includes('Data Structures'),
    'Overlap error names the existing class'
  );

  const editingOverlap = validateClassInput(
    {
      subject_name: 'Data Structures',
      title: 'Lecture (updated)',
      weekday: 3,
      start_time: '09:00',
      end_time: '10:00',
    },
    { existingClasses: sampleClasses, excludeId: 'wed-1' }
  );
  assert(editingOverlap.isValid === true, 'Editing a class does not conflict with its old slot');

  const noExisting = validateClassInput({
    subject_name: 'Biology',
    title: 'Lab',
    weekday: 3,
    start_time: '09:30',
    end_time: '10:30',
  });
  assert(noExisting.isValid === true, 'Overlap check passes when no existing classes supplied');
}

console.log('\n--- Testing Ordering & Weekly Grouping ---');
{
  const wednesday = getClassesForWeekday(sampleClasses, 3);
  assert(wednesday.length === 2, 'Two classes found for Wednesday');
  assert(wednesday[0].id === 'wed-1' && wednesday[1].id === 'wed-2', 'Day classes sorted chronologically');

  const reversed = sortClassesByTime(wednesday, 'desc');
  assert(reversed[0].id === 'wed-2', 'Descending sort supported');

  const schedule = getWeekSchedule(sampleClasses);
  assert(schedule.length === 7, 'Weekly schedule always has seven days');
  assert(schedule[0].label === 'Monday', 'Weekly schedule starts Monday');
  assert(schedule.map((day) => day.weekday).join(',') === '1,2,3,4,5,6,0', 'Weekly order is Monday-first');
  assert(schedule[0].classes.length === 1, 'Monday holds its class');

  assert(getClassesForWeekday(sampleClasses, 6).length === 0, 'Saturday empty');
  assert(getClassesForWeekday(null, 3).length === 0, 'Null class list handled');
}

console.log('\n--- Testing Today & Status Scheduling ---');
{
  assert(getWeekdayFromDate(NOW) === 3, '2026-10-28 is Wednesday (3)');
  assert(getWeekdayFromDate(new Date(2026, 9, 25)) === 0, '2026-10-25 is Sunday (0)');

  const today = getTodayClasses(sampleClasses, NOW);
  assert(today.length === 2, 'Two classes scheduled today');
  assert(today[0].id === 'wed-1', "Today's classes chronological");

  assert(getClassStatus(sampleClasses[2], NOW) === 'ended', '09:00-10:00 class ended at 10:15');
  assert(getClassStatus(sampleClasses[0], NOW) === 'upcoming', '11:00 class still upcoming at 10:15');
  assert(
    getClassStatus(sampleClasses[0], new Date(2026, 9, 28, 11, 30)) === 'ongoing',
    'Class reported ongoing inside its window'
  );
  assert(
    getClassStatus(sampleClasses[0], new Date(2026, 9, 28, 12, 30)) === 'ended',
    'Class reported ended at its end time'
  );
}

console.log('\n--- Testing Upcoming Classes Across Days ---');
{
  const upcoming = getUpcomingClasses(sampleClasses, NOW, 5);
  const ids = upcoming.map((item) => item.class.id);

  assert(ids[0] === 'wed-2', 'Next class is today at 11:00, skipping started classes');
  assert(upcoming[0].dayOffset === 0, 'First upcoming entry is today');
  assert(ids[1] === 'thu-1', 'Thursday class follows');
  assert(upcoming[1].dayOffset === 1, 'Thursday is one day ahead');
  assert(ids[2] === 'fri-1', 'Friday class follows');
  assert(ids[3] === 'sun-1', 'Sunday class follows after the weekend');
  assert(upcoming[3].dayOffset === 4, 'Sunday is four days ahead');
  assert(ids[4] === 'mon-1', 'Next Monday wraps the week');
  assert(upcoming[4].dayOffset === 5, 'Next Monday is five days ahead');

  const limited = getUpcomingClasses(sampleClasses, NOW, 2);
  assert(limited.length === 2, 'Upcoming limit respected');
  assert(getUpcomingClasses([], NOW).length === 0, 'Empty timetable yields no upcoming classes');
  assert(getUpcomingClasses(sampleClasses, new Date(2026, 9, 28, 23, 59), 1)[0].dayOffset === 1, 'Late night rolls to next day');
}

if (failures === 0) {
  console.log('\nALL TIMETABLE VALIDATION TESTS PASSED!');
  process.exit(0);
} else {
  console.error(`\n${failures} TIMETABLE TESTS FAILED!`);
  process.exit(1);
}
