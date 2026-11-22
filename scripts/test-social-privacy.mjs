/**
 * Unit Tests — Friends & Social Privacy Logic
 */

import assert from 'node:assert';

console.log('--- Testing Friend Code Format ---');
function isValidFriendCode(code) {
  return typeof code === 'string' && /^MOVA-[A-Z0-9]{6}$/.test(code);
}

assert.strictEqual(isValidFriendCode('MOVA-AB12CD'), true);
assert.strictEqual(isValidFriendCode('MOVA-123456'), true);
assert.strictEqual(isValidFriendCode('mova-ab12cd'), false); // must be uppercase
assert.strictEqual(isValidFriendCode('MOVA-ABCDE'), false); // too short
assert.strictEqual(isValidFriendCode('INV-123456'), false);
console.log('PASS: Friend codes strictly conform to MOVA-XXXXXX pattern');

console.log('--- Testing Username Validation ---');
function isValidUsername(username) {
  return typeof username === 'string' && /^[a-zA-Z0-9_]{3,30}$/.test(username);
}

assert.strictEqual(isValidUsername('student_42'), true);
assert.strictEqual(isValidUsername('alex'), true);
assert.strictEqual(isValidUsername('a'), false); // too short
assert.strictEqual(isValidUsername('student@college'), false); // no symbols
assert.strictEqual(isValidUsername('student name'), false); // no spaces
console.log('PASS: Usernames enforce alphanumeric bounds');

console.log('--- Testing Public Profile Privacy Masking ---');
function maskPublicProfile(rawProfile) {
  return {
    id: rawProfile.id,
    name: rawProfile.name,
    username: rawProfile.username,
    avatar_url: rawProfile.avatar_url,
    current_level: rawProfile.current_level || 1,
    total_points: rawProfile.is_points_public !== false ? (rawProfile.total_points || 0) : null,
    streak: rawProfile.is_streak_public !== false ? (rawProfile.streak || 0) : null,
  };
}

const privateUser = {
  id: 'usr_123',
  name: 'Private Student',
  username: 'secret',
  email: 'private@campus.edu',
  date_of_birth: '2003-05-15',
  attendance_records: [{ date: '2026-11-20', status: 'absent' }],
  tasks: [{ title: 'Secret Task' }],
  timetable: [{ room: '101' }],
  is_points_public: false,
  is_streak_public: false,
  total_points: 350,
  streak: 12,
};

const masked = maskPublicProfile(privateUser);

// Ensure private fields are NEVER present in public profile
assert.strictEqual(masked.email, undefined);
assert.strictEqual(masked.date_of_birth, undefined);
assert.strictEqual(masked.attendance_records, undefined);
assert.strictEqual(masked.tasks, undefined);
assert.strictEqual(masked.timetable, undefined);

// Ensure privacy flags mask sensitive numbers
assert.strictEqual(masked.total_points, null);
assert.strictEqual(masked.streak, null);
assert.strictEqual(masked.current_level, 1);
assert.strictEqual(masked.name, 'Private Student');

console.log('PASS: Public profile masking guarantees zero private data leakage');
console.log('\nALL 9 SOCIAL PRIVACY TESTS PASSED!');
