/**
 * Mova Campus — Gamification, XP & Rewards Engine
 *
 * Implements server-backed, auditable rewards and level calculations:
 * - Immutable ledger tracking points, XP, reasons, and references.
 * - Idempotency & Duplicate Prevention: Every reward checks reference_id (e.g. task_id)
 *   to ensure users cannot exploit repeated task completion/uncompletion.
 * - Dynamic level computation with transparent tier progression.
 * - Milestone achievement unlocks.
 * - Resilient fallback for offline or unmigrated databases.
 */

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  ACHIEVEMENTS_LIST,
  calculateLevelFromXp,
  calculateTotalsFromLedger,
  canAwardStreakReward,
  canAwardTaskReward,
} from '@/utils/gamification-engine';
import { logger } from '@/utils/logger';

export {
  ACHIEVEMENTS_LIST,
  calculateLevelFromXp,
  calculateTotalsFromLedger,
  canAwardStreakReward,
  canAwardTaskReward,
};

export const rewardService = {
  isConfigured() {
    return isSupabaseConfigured && supabase !== null;
  },

  /**
   * Fetches user's total points, XP, level, and ledger entries.
   */
  async getUserStats() {
    if (!this.isConfigured()) {
      return { totalPoints: 0, totalXp: 0, levelInfo: calculateLevelFromXp(0), ledger: [], error: null };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { totalPoints: 0, totalXp: 0, levelInfo: calculateLevelFromXp(0), ledger: [], error: null };

      // Query reward ledger
      const { data: ledger, error: ledgerError } = await supabase
        .from('reward_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ledgerError) {
        logger.warn('reward_ledger query notice:', ledgerError.message);
        return { totalPoints: 0, totalXp: 0, levelInfo: calculateLevelFromXp(0), ledger: [], error: null };
      }

      const totals = calculateTotalsFromLedger(ledger || []);

      return {
        totalPoints: totals.totalPoints,
        totalXp: totals.totalXp,
        levelInfo: calculateLevelFromXp(totals.totalXp),
        ledger: ledger || [],
        error: null,
      };
    } catch (err) {
      return { totalPoints: 0, totalXp: 0, levelInfo: calculateLevelFromXp(0), ledger: [], error: err };
    }
  },

  /**
   * Awards points for completing a task.
   * Prevents duplicate awards by using reference_type='task' and reference_id=taskId.
   */
  async awardTaskCompletion(taskId, taskTitle = 'Task') {
    if (!this.isConfigured() || !taskId) return { awarded: false, reason: 'unconfigured' };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { awarded: false, reason: 'unauthenticated' };

      // Check if already awarded
      const { data: existing } = await supabase
        .from('reward_ledger')
        .select('id')
        .eq('user_id', user.id)
        .eq('reference_type', 'task')
        .eq('reference_id', String(taskId))
        .maybeSingle();

      if (existing) {
        return { awarded: false, reason: 'already_claimed' };
      }

      const points = 15;
      const xp = 15;

      const { error: insertError } = await supabase.from('reward_ledger').insert({
        user_id: user.id,
        points,
        xp,
        reason: `Completed task: ${taskTitle.slice(0, 50)}`,
        reference_type: 'task',
        reference_id: String(taskId),
      });

      if (insertError) {
        logger.warn('Could not insert task reward:', insertError.message);
        return { awarded: false, error: insertError };
      }

      // Check achievement for first task
      await this.unlockAchievement('first_task');

      return { awarded: true, points, xp };
    } catch (err) {
      return { awarded: false, error: err };
    }
  },

  /**
   * Awards streak bonus (e.g. for maintaining 3-day or 7-day streak).
   */
  async awardStreakMilestone(milestone, todayDateStr) {
    if (!this.isConfigured() || !milestone) return { awarded: false };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { awarded: false };

      const refId = `streak_${milestone}_${todayDateStr}`;
      const { data: existing } = await supabase
        .from('reward_ledger')
        .select('id')
        .eq('user_id', user.id)
        .eq('reference_type', 'streak')
        .eq('reference_id', refId)
        .maybeSingle();

      if (existing) return { awarded: false, reason: 'already_claimed' };

      const points = milestone >= 7 ? 75 : 30;
      const xp = milestone >= 7 ? 75 : 30;

      await supabase.from('reward_ledger').insert({
        user_id: user.id,
        points,
        xp,
        reason: `Maintained ${milestone}-day consistency streak!`,
        reference_type: 'streak',
        reference_id: refId,
      });

      if (milestone >= 7) {
        await this.unlockAchievement('streak_7');
      } else if (milestone >= 3) {
        await this.unlockAchievement('streak_3');
      }

      return { awarded: true, points, xp };
    } catch (err) {
      return { awarded: false, error: err };
    }
  },

  /**
   * Unlocks an achievement for the user if not yet unlocked.
   */
  async unlockAchievement(achievementKey) {
    if (!this.isConfigured() || !achievementKey) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const achievement = ACHIEVEMENTS_LIST.find((a) => a.key === achievementKey);
      if (!achievement) return null;

      const { data: existing } = await supabase
        .from('user_achievements')
        .select('id')
        .eq('user_id', user.id)
        .eq('achievement_key', achievementKey)
        .maybeSingle();

      if (existing) return null;

      const { error } = await supabase.from('user_achievements').insert({
        user_id: user.id,
        achievement_key: achievement.key,
        title: achievement.title,
        description: achievement.description,
      });

      if (!error && achievement.points > 0) {
        await supabase.from('reward_ledger').insert({
          user_id: user.id,
          points: achievement.points,
          xp: achievement.points,
          reason: `Unlocked Achievement: ${achievement.title}`,
          reference_type: 'achievement',
          reference_id: achievement.key,
        });
      }

      return achievement;
    } catch {
      return null;
    }
  },

  /**
   * Fetches all user unlocked achievements.
   */
  async getUnlockedAchievements() {
    if (!this.isConfigured()) return { achievements: [], error: null };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { achievements: [], error: null };

      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });

      if (error) {
        logger.warn('user_achievements query notice:', error.message);
        return { achievements: [], error: null };
      }

      return { achievements: data || [], error: null };
    } catch (err) {
      return { achievements: [], error: err };
    }
  },
};
