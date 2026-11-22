/**
 * Unit Tests — Reward Service & Gamification Logic
 */

import assert from 'node:assert';
import {
  ACHIEVEMENTS_LIST,
  calculateLevelFromXp,
  calculateTotalsFromLedger,
  canAwardStreakReward,
  canAwardTaskReward,
} from '../src/utils/gamification-engine.js';

console.log('--- Testing Level Calculations from XP ---');

// Freshmen (0-99)
const lvl0 = calculateLevelFromXp(0);
assert.strictEqual(lvl0.level, 1);
assert.strictEqual(lvl0.title, 'Freshman');
assert.strictEqual(lvl0.currentLevelXp, 0);
assert.strictEqual(lvl0.nextLevelXp, 100);
assert.strictEqual(lvl0.progress, 0);

const lvl99 = calculateLevelFromXp(99);
assert.strictEqual(lvl99.level, 1);
assert.strictEqual(lvl99.currentLevelXp, 99);
assert.strictEqual(lvl99.progress, 0.99);

// Sophomore (100-249)
const lvl100 = calculateLevelFromXp(100);
assert.strictEqual(lvl100.level, 2);
assert.strictEqual(lvl100.title, 'Sophomore');
assert.strictEqual(lvl100.currentLevelXp, 0);
assert.strictEqual(lvl100.nextLevelXp, 150);

// Junior (250-449)
const lvl250 = calculateLevelFromXp(250);
assert.strictEqual(lvl250.level, 3);
assert.strictEqual(lvl250.title, 'Junior');
assert.strictEqual(lvl250.currentLevelXp, 0);
assert.strictEqual(lvl250.nextLevelXp, 200);

// Senior (450-699)
const lvl450 = calculateLevelFromXp(450);
assert.strictEqual(lvl450.level, 4);
assert.strictEqual(lvl450.title, 'Senior');

// Scholar (700-999)
const lvl700 = calculateLevelFromXp(700);
assert.strictEqual(lvl700.level, 5);
assert.strictEqual(lvl700.title, 'Scholar');

// Master (1000+)
const lvl1200 = calculateLevelFromXp(1200);
assert.strictEqual(lvl1200.level, 6);
assert.strictEqual(lvl1200.title, 'Campus Master');

console.log('PASS: XP boundaries correctly map to academic tiers and progress percentages');

console.log('--- Testing Achievement Definitions ---');
assert(ACHIEVEMENTS_LIST.length >= 8);
ACHIEVEMENTS_LIST.forEach((ach) => {
  assert(typeof ach.key === 'string' && ach.key.length > 0);
  assert(typeof ach.title === 'string' && ach.title.length > 0);
  assert(typeof ach.description === 'string' && ach.description.length > 0);
  assert(typeof ach.points === 'number' && ach.points > 0);
});
console.log('PASS: All achievement badges conform to reward schema');

console.log('--- Testing Idempotency & Duplicate Prevention ---');
const sampleLedger = [
  { points: 15, xp: 15, reference_type: 'task', reference_id: 'task_1' },
  { points: 30, xp: 30, reference_type: 'streak', reference_id: 'streak_3_2026-11-22' },
];

assert.strictEqual(canAwardTaskReward(sampleLedger, 'task_1'), false); // already claimed
assert.strictEqual(canAwardTaskReward(sampleLedger, 'task_2'), true);  // new task
assert.strictEqual(canAwardStreakReward(sampleLedger, 3, '2026-11-22'), false); // already claimed
assert.strictEqual(canAwardStreakReward(sampleLedger, 3, '2026-11-23'), true);  // different day
assert.strictEqual(canAwardStreakReward(sampleLedger, 7, '2026-11-22'), true);  // higher milestone

const totals = calculateTotalsFromLedger(sampleLedger);
assert.strictEqual(totals.totalPoints, 45);
assert.strictEqual(totals.totalXp, 45);
console.log('PASS: Ledger enforces duplicate-claim prevention on completed tasks and streaks');

console.log('\nALL 12 REWARD ENGINE TESTS PASSED!');
