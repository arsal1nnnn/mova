/**
 * Mova Campus — Pure Gamification Engine
 *
 * Implements deterministic level calculations, XP brackets,
 * reward eligibility checks, and milestone definitions without
 * native device dependencies.
 */

export const ACHIEVEMENTS_LIST = [
  { key: 'first_task', title: 'First Step', description: 'Completed your first study task', points: 20, icon: 'check' },
  { key: 'task_streak_3', title: 'On a Roll', description: 'Completed 3 tasks in a single day', points: 30, icon: 'zap' },
  { key: 'task_crusher_10', title: 'Task Crusher', description: 'Completed 10 tasks in total', points: 50, icon: 'target' },
  { key: 'streak_3', title: 'Consistency Scout', description: 'Maintained a 3-day consistency streak', points: 30, icon: 'flame' },
  { key: 'streak_7', title: 'Weekly Warrior', description: 'Maintained a 7-day consistency streak', points: 75, icon: 'flame' },
  { key: 'attendance_safe', title: 'Attendance Titan', description: 'All registered subjects above target', points: 50, icon: 'attendance' },
  { key: 'schedule_built', title: 'Time Architect', description: 'Configured your full weekly timetable', points: 40, icon: 'timetable' },
  { key: 'campus_connected', title: 'Campus Connected', description: 'Connected with your first friend', points: 25, icon: 'user' },
];

export function calculateLevelFromXp(xp = 0) {
  const safeXp = Math.max(0, parseInt(xp, 10) || 0);
  if (safeXp < 100) return { level: 1, title: 'Freshman', currentLevelXp: safeXp, nextLevelXp: 100, progress: safeXp / 100 };
  if (safeXp < 250) return { level: 2, title: 'Sophomore', currentLevelXp: safeXp - 100, nextLevelXp: 150, progress: (safeXp - 100) / 150 };
  if (safeXp < 450) return { level: 3, title: 'Junior', currentLevelXp: safeXp - 250, nextLevelXp: 200, progress: (safeXp - 250) / 200 };
  if (safeXp < 700) return { level: 4, title: 'Senior', currentLevelXp: safeXp - 450, nextLevelXp: 250, progress: (safeXp - 450) / 250 };
  if (safeXp < 1000) return { level: 5, title: 'Scholar', currentLevelXp: safeXp - 700, nextLevelXp: 300, progress: (safeXp - 700) / 300 };

  const surplus = safeXp - 1000;
  const extraLevels = Math.floor(surplus / 400) + 1;
  const inLevelXp = surplus % 400;
  return {
    level: 5 + extraLevels,
    title: 'Campus Master',
    currentLevelXp: inLevelXp,
    nextLevelXp: 400,
    progress: inLevelXp / 400,
  };
}

export function canAwardTaskReward(ledger = [], taskId) {
  if (!taskId) return false;
  const strId = String(taskId);
  return !ledger.some((entry) => entry.reference_type === 'task' && String(entry.reference_id) === strId);
}

export function canAwardStreakReward(ledger = [], milestone, dateStr) {
  if (!milestone || !dateStr) return false;
  const refId = `streak_${milestone}_${dateStr}`;
  return !ledger.some((entry) => entry.reference_type === 'streak' && entry.reference_id === refId);
}

export function calculateTotalsFromLedger(ledger = []) {
  return ledger.reduce(
    (acc, row) => ({
      totalPoints: acc.totalPoints + (row.points || 0),
      totalXp: acc.totalXp + (row.xp || 0),
    }),
    { totalPoints: 0, totalXp: 0 }
  );
}
