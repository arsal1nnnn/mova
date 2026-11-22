import {
  isLeapYear,
  getDaysInMonth,
  validateDisplayName,
  validateDateOfBirth,
  validateAvatarUrl,
  calculateAge,
  validateProfileInput,
} from '../src/utils/profile-validators.js';

let failures = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failures++;
  } else {
    console.log(`PASS: ${message}`);
  }
}

console.log('--- Testing Leap Year & Days In Month ---');
assert(isLeapYear(2000) === true, '2000 is leap year (divisible by 400)');
assert(isLeapYear(1900) === false, '1900 is NOT leap year (divisible by 100, not 400)');
assert(isLeapYear(2004) === true, '2004 is leap year');
assert(isLeapYear(2005) === false, '2005 is not leap year');
assert(getDaysInMonth(2004, 2) === 29, 'Feb 2004 has 29 days');
assert(getDaysInMonth(2005, 2) === 28, 'Feb 2005 has 28 days');
assert(getDaysInMonth(2024, 4) === 30, 'April has 30 days');

console.log('\n--- Testing Display Name Validation ---');
assert(validateDisplayName('').isValid === false, 'Empty name rejected');
assert(validateDisplayName('   ').isValid === false, 'Whitespace name rejected');
assert(validateDisplayName(123).isValid === false, 'Non-string name rejected');
assert(validateDisplayName('A'.repeat(101)).isValid === false, 'Name > 100 chars rejected');
assert(validateDisplayName('Arsalan').isValid === true, 'Normal name valid');
assert(validateDisplayName('   John Doe   ').sanitizedValue === 'John Doe', 'Name trimmed correctly');

console.log('\n--- Testing Date of Birth Validation ---');
const refDate = new Date(2026, 9, 25); // Oct 25, 2026

assert(validateDateOfBirth('2004-05-18', refDate).isValid === true, 'Standard past DOB valid');
assert(validateDateOfBirth('2026-10-25', refDate).isValid === true, 'Today DOB valid');
assert(validateDateOfBirth('2026-10-26', refDate).isValid === false, 'Tomorrow DOB rejected (future)');
assert(validateDateOfBirth('2030-01-01', refDate).isValid === false, 'Future year rejected');
assert(validateDateOfBirth('1899-12-31', refDate).isValid === false, 'Year < 1900 rejected');
assert(validateDateOfBirth('2004-02-29', refDate).isValid === true, 'Leap year Feb 29 valid');
assert(validateDateOfBirth('2005-02-29', refDate).isValid === false, 'Non-leap year Feb 29 rejected');
assert(validateDateOfBirth('2004-13-01', refDate).isValid === false, 'Month 13 rejected');
assert(validateDateOfBirth('2004-04-31', refDate).isValid === false, 'April 31 rejected');
assert(validateDateOfBirth('invalid-date', refDate).isValid === false, 'Malformed string rejected');

console.log('\n--- Testing Calendar-Exact Age Calculation ---');
// Reference date: 2026-10-25
assert(calculateAge('2000-10-25', refDate) === 26, 'Birthday today: exactly 26');
assert(calculateAge('2000-10-26', refDate) === 25, 'Birthday tomorrow: still 25');
assert(calculateAge('2000-10-24', refDate) === 26, 'Birthday yesterday: already 26');
assert(calculateAge('2000-12-31', refDate) === 25, 'Birthday later this year: 25');
assert(calculateAge('2000-01-01', refDate) === 26, 'Birthday earlier this year: 26');

// Leap year boundary: born Feb 29, 2004
const feb28_2005 = new Date(2005, 1, 28); // Feb 28, 2005
const mar01_2005 = new Date(2005, 2, 1);  // Mar 01, 2005
const feb29_2008 = new Date(2008, 1, 29); // Feb 29, 2008
assert(calculateAge('2004-02-29', feb28_2005) === 0, 'Born Feb 29: on Feb 28 following non-leap year is 0');
assert(calculateAge('2004-02-29', mar01_2005) === 1, 'Born Feb 29: on Mar 1 following non-leap year is 1');
assert(calculateAge('2004-02-29', feb29_2008) === 4, 'Born Feb 29: on Feb 29 4 years later is exactly 4');

console.log('\n--- Testing Full Profile Input Validation ---');
const validResult = validateProfileInput(
  { name: '  Mova Student  ', date_of_birth: '2004-06-15', avatar_url: 'avatars/uid/test.png' },
  refDate
);
assert(validResult.isValid === true, 'Complete profile valid');
assert(validResult.sanitizedData.name === 'Mova Student', 'Profile name sanitized');
assert(validResult.sanitizedData.avatar_url === 'avatars/uid/test.png', 'Avatar path preserved');

const invalidResult = validateProfileInput(
  { name: '', date_of_birth: '2030-01-01' },
  refDate
);
assert(invalidResult.isValid === false, 'Invalid profile caught');
assert(Boolean(invalidResult.errors.name), 'Name error recorded');
assert(Boolean(invalidResult.errors.date_of_birth), 'DOB error recorded');

if (failures === 0) {
  console.log('\nALL 27 BOUNDARY TESTS PASSED!');
  process.exit(0);
} else {
  console.error(`\n${failures} TESTS FAILED!`);
  process.exit(1);
}
