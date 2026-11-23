/**
 * Mova Campus — Focus Mode Service
 *
 * Manages study focus sessions, tracks completion statistics, calculates daily
 * focus time and streaks, and idempotently awards gamification XP.
 * Provides resilient offline/local storage fallback when backend table is pending.
 */

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { rewardService } from '@/services/reward-service';
import { logger } from '@/utils/logger';

const LOCAL_STORAGE_KEY = 'mova_focus_sessions_backup';

function getLocalSessions() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    }
  } catch {
    // Ignore storage parse errors
  }
  return [];
}

function saveLocalSession(session) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const sessions = getLocalSessions();
      sessions.unshift(session);
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions.slice(0, 50)));
    }
  } catch {
    // Ignore storage write errors
  }
}

export const focusService = {
  isConfigured() {
    return isSupabaseConfigured && supabase !== null;
  },

  /**
   * Records a completed focus session and awards gamification XP.
   *
   * @param {Object} params
   * @param {number} params.durationMinutes - Total duration completed
   * @param {string} [params.presetName='pomodoro'] - Preset mode (e.g. 'pomodoro', 'deep_work', 'marathon', 'custom')
   * @param {string} [params.startedAt] - ISO timestamp
   * @param {string} [params.completedAt] - ISO timestamp
   * @returns {Promise<{ success: boolean, session?: Object, xpAwarded?: number, error?: any }>}
   */
  async recordSession({ durationMinutes, presetName = 'pomodoro', startedAt, completedAt }) {
    const minutes = Math.max(1, parseInt(durationMinutes, 10) || 25);
    const completedTime = completedAt || new Date().toISOString();
    const startedTime = startedAt || new Date(Date.now() - minutes * 60000).toISOString();
    const sessionId = `fs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    let userId = null;
    if (this.isConfigured()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) userId = user.id;
      } catch {
        // Fall back gracefully
      }
    }

    // Award XP via rewards engine
    let xpAwarded = Math.max(10, Math.round(minutes * 1));
    try {
      const rewardRes = await rewardService.awardFocusSession(minutes, sessionId);
      if (rewardRes.awarded) {
        xpAwarded = rewardRes.xp || xpAwarded;
      }
    } catch (err) {
      logger.warn('Focus XP award notice:', err.message);
    }

    const sessionPayload = {
      id: sessionId,
      user_id: userId,
      duration_minutes: minutes,
      preset_name: presetName,
      xp_awarded: xpAwarded,
      started_at: startedTime,
      completed_at: completedTime,
      created_at: new Date().toISOString(),
    };

    if (this.isConfigured() && userId) {
      try {
        const { data, error } = await supabase
          .from('focus_sessions')
          .insert({
            duration_minutes: minutes,
            preset_name: presetName,
            xp_awarded: xpAwarded,
            started_at: startedTime,
            completed_at: completedTime,
          })
          .select()
          .maybeSingle();

        if (error) {
          logger.warn('Focus session insert notice, storing locally:', error.message);
          saveLocalSession(sessionPayload);
        } else if (data) {
          return { success: true, session: data, xpAwarded };
        }
      } catch (err) {
        logger.warn('Focus session error, fallback to local:', err.message);
        saveLocalSession(sessionPayload);
      }
    } else {
      saveLocalSession(sessionPayload);
    }

    return { success: true, session: sessionPayload, xpAwarded };
  },

  /**
   * Retrieves summary statistics and history for focus sessions.
   */
  async getFocusStats() {
    let sessions = [];

    if (this.isConfigured()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('focus_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('completed_at', { ascending: false })
            .limit(50);

          if (!error && data) {
            sessions = data;
          }
        }
      } catch (err) {
        logger.warn('Failed to fetch remote focus stats:', err.message);
      }
    }

    if (sessions.length === 0) {
      sessions = getLocalSessions();
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    let todayMinutes = 0;
    let todaySessions = 0;
    let totalMinutes = 0;
    const activeDates = new Set();

    for (const s of sessions) {
      const duration = parseInt(s.duration_minutes, 10) || 0;
      totalMinutes += duration;

      const compDate = new Date(s.completed_at || s.created_at);
      if (compDate.getTime() >= todayStart) {
        todayMinutes += duration;
        todaySessions += 1;
      }

      const dateStr = compDate.toISOString().slice(0, 10);
      activeDates.add(dateStr);
    }

    // Calculate streak
    let streakDays = 0;
    const checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    while (true) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      if (activeDates.has(dateStr)) {
        streakDays += 1;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      todayMinutes,
      todaySessions,
      totalMinutes,
      totalSessions: sessions.length,
      streakDays,
      recentSessions: sessions.slice(0, 10),
    };
  },
};
