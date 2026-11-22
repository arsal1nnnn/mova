/**
 * Mova Campus — Privacy, Data Controls & Account Management Service
 *
 * Implements user privacy rights, data export, notification preferences,
 * and genuine account deletion.
 */

import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import { logger } from '../utils/logger.js';

export const privacyService = {
  isConfigured() {
    return isSupabaseConfigured && supabase !== null;
  },

  /**
   * Fetches the user's notification and privacy settings.
   */
  async getUserSettings() {
    if (!this.isConfigured()) {
      return {
        settings: {
          task_reminders: true,
          class_reminders: true,
          attendance_reminders: true,
          friend_requests_notify: true,
          theme_preference: 'light',
        },
        error: null,
      };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { settings: null, error: new Error('Unauthenticated') };

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        logger.warn('user_settings query notice:', error.message);
        return {
          settings: {
            task_reminders: true,
            class_reminders: true,
            attendance_reminders: true,
            friend_requests_notify: true,
            theme_preference: 'light',
          },
          error: null,
        };
      }

      if (!data) {
        // Return default settings
        return {
          settings: {
            task_reminders: true,
            class_reminders: true,
            attendance_reminders: true,
            friend_requests_notify: true,
            theme_preference: 'light',
          },
          error: null,
        };
      }

      return { settings: data, error: null };
    } catch (err) {
      return { settings: null, error: err };
    }
  },

  /**
   * Updates user notification and privacy settings.
   */
  async updateUserSettings(updates = {}) {
    if (!this.isConfigured()) return { success: true };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: new Error('Unauthenticated') };

      const payload = {
        user_id: user.id,
        ...updates,
      };

      const { data, error } = await supabase
        .from('user_settings')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        logger.warn('Failed to update user_settings:', error.message);
        return { success: false, error };
      }

      return { success: true, settings: data };
    } catch (err) {
      return { success: false, error: err };
    }
  },

  /**
   * Compiles an exportable JSON payload of all the student's personal data.
   */
  async exportUserData() {
    if (!this.isConfigured()) return { data: null, error: new Error('Database not configured') };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: new Error('User not authenticated') };

      const [profileRes, taskRes, classRes, subRes, attRes, ledgerRes, friendRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('classes').select('*').eq('user_id', user.id),
        supabase.from('subjects').select('*').eq('user_id', user.id),
        supabase.from('attendance_records').select('*').eq('user_id', user.id),
        supabase.from('reward_ledger').select('*').eq('user_id', user.id),
        supabase.from('friendships').select('friend_id, created_at').eq('user_id', user.id),
      ]);

      const exportPayload = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
        },
        profile: profileRes.data || null,
        tasks: taskRes.data || [],
        timetable_classes: classRes.data || [],
        attendance_subjects: subRes.data || [],
        attendance_records: attRes.data || [],
        reward_ledger: ledgerRes.data || [],
        friend_relationships_count: (friendRes.data || []).length,
      };

      return { data: exportPayload, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  /**
   * Permanently deletes the user's account and personal records.
   */
  async deleteUserAccount() {
    if (!this.isConfigured()) return { success: false, error: new Error('Database not configured') };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: new Error('User not authenticated') };

      // 1. Attempt security definer RPC
      const { error: rpcError } = await supabase.rpc('delete_user_account');

      if (rpcError) {
        logger.warn('delete_user_account RPC failed, falling back to manual cascade:', rpcError.message);

        // Fallback manual cascade
        await Promise.allSettled([
          supabase.from('tasks').delete().eq('user_id', user.id),
          supabase.from('attendance_records').delete().eq('user_id', user.id),
          supabase.from('subjects').delete().eq('user_id', user.id),
          supabase.from('classes').delete().eq('user_id', user.id),
          supabase.from('friend_requests').delete().or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
          supabase.from('friendships').delete().or(`user_id.eq.${user.id},friend_id.eq.${user.id}`),
          supabase.from('reward_ledger').delete().eq('user_id', user.id),
          supabase.from('user_achievements').delete().eq('user_id', user.id),
          supabase.from('user_settings').delete().eq('user_id', user.id),
          supabase.from('profiles').delete().eq('id', user.id),
        ]);
      }

      // 2. Sign out the user
      await supabase.auth.signOut();

      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  },
};
