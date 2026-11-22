/**
 * Mova Timetable Data-Access Service
 *
 * CRUD operations for public.classes — recurring weekly college class slots.
 * Ownership is enforced by Supabase RLS and by scoping every query to the
 * authenticated user. Inputs are validated (including time-range and
 * overlap checks) before any write.
 */

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import {
  getTodayClasses,
  getUpcomingClasses,
  getWeekSchedule as buildWeekSchedule,
  validateClassInput,
} from '@/utils/timetable-validators';

const CLASS_COLUMNS =
  'id, user_id, subject_name, title, weekday, start_time, end_time, room, created_at, updated_at';

const NOT_CONFIGURED_MESSAGE =
  'Supabase is not configured. Please set environment variables.';

function toError(err) {
  return err instanceof Error ? err : new Error(String(err));
}

export const timetableService = {
  isConfigured() {
    return Boolean(isSupabaseConfigured && supabase !== null);
  },

  /**
   * Fetches the authenticated user's timetable.
   *
   * @param {{ weekday?: number | null }} [options]
   * @returns {Promise<{ classes: Array<object>, error: Error | null }>}
   */
  async getClasses({ weekday = null } = {}) {
    if (!this.isConfigured()) {
      return { classes: [], error: new Error(NOT_CONFIGURED_MESSAGE) };
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { classes: [], error: new Error('User is not authenticated.') };
      }

      let query = supabase
        .from('classes')
        .select(CLASS_COLUMNS)
        .eq('user_id', user.id);

      if (Number.isInteger(weekday) && weekday >= 0 && weekday <= 6) {
        query = query.eq('weekday', weekday);
      }

      const { data, error } = await query
        .order('weekday', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        logger.error('Failed to fetch timetable classes', error.message);
        return { classes: [], error };
      }

      return { classes: data ?? [], error: null };
    } catch (err) {
      logger.error('Unexpected error in getClasses', err);
      return { classes: [], error: toError(err) };
    }
  },

  /**
   * Fetches one class slot owned by the authenticated user.
   *
   * @param {string} id
   * @returns {Promise<{ class: object | null, error: Error | null }>}
   */
  async getClassById(id) {
    if (!this.isConfigured()) {
      return { class: null, error: new Error(NOT_CONFIGURED_MESSAGE) };
    }

    if (!id || typeof id !== 'string') {
      return { class: null, error: new Error('Class ID must be a non-empty string.') };
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { class: null, error: new Error('User is not authenticated.') };
      }

      const { data, error } = await supabase
        .from('classes')
        .select(CLASS_COLUMNS)
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        logger.error('Failed to fetch class by id', error.message);
        return { class: null, error };
      }

      return { class: data, error: null };
    } catch (err) {
      return { class: null, error: toError(err) };
    }
  },

  /**
   * Returns the Monday-first weekly schedule with chronological class lists.
   *
   * @returns {Promise<{ schedule: Array<object>, classes: Array<object>, error: Error | null }>}
   */
  async getWeekSchedule() {
    const { classes, error } = await this.getClasses();
    return { schedule: buildWeekSchedule(classes), classes, error };
  },

  /**
   * Returns today's classes in chronological order.
   *
   * @param {Date} [now=new Date()]
   * @returns {Promise<{ classes: Array<object>, allClasses: Array<object>, error: Error | null }>}
   */
  async getTodayClasses(now = new Date()) {
    const { classes, error } = await this.getClasses();
    return { classes: getTodayClasses(classes, now), allClasses: classes, error };
  },

  /**
   * Returns upcoming classes across today and the following six days.
   *
   * @param {{ limit?: number, now?: Date }} [options]
   * @returns {Promise<{ upcoming: Array<object>, error: Error | null }>}
   */
  async getUpcomingClasses({ limit = 5, now = new Date() } = {}) {
    const { classes, error } = await this.getClasses();
    if (error) return { upcoming: [], error };
    return { upcoming: getUpcomingClasses(classes, now, limit), error: null };
  },

  /**
   * Creates a new recurring weekly class slot for the authenticated user.
   *
   * @param {object} input
   * @returns {Promise<{ class: object | null, error: Error | null, errors?: Record<string, string> }>}
   */
  async createClass(input = {}) {
    if (!this.isConfigured()) {
      return { class: null, error: new Error(NOT_CONFIGURED_MESSAGE) };
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { class: null, error: new Error('User is not authenticated.') };
      }

      // Overlap detection needs the user's existing slots
      const { classes: existingClasses, error: fetchError } = await this.getClasses();
      if (fetchError) {
        return { class: null, error: fetchError };
      }

      const validation = validateClassInput(input, { existingClasses });
      if (!validation.isValid) {
        return {
          class: null,
          error: new Error(Object.values(validation.errors)[0] || 'Invalid class details.'),
          errors: validation.errors,
        };
      }

      const payload = {
        ...validation.sanitizedData,
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from('classes')
        .insert(payload)
        .select(CLASS_COLUMNS)
        .single();

      if (error) {
        logger.error('Failed to insert class', error.message);
        return { class: null, error };
      }

      logger.info('Class created successfully', { id: data.id });
      return { class: data, error: null };
    } catch (err) {
      logger.error('Unexpected error in createClass', err);
      return { class: null, error: toError(err) };
    }
  },

  /**
   * Updates an existing class slot owned by the authenticated user.
   * The merged record is re-validated so partially supplied updates cannot
   * create an invalid or overlapping slot.
   *
   * @param {string} id
   * @param {object} updates
   * @returns {Promise<{ class: object | null, error: Error | null, errors?: Record<string, string> }>}
   */
  async updateClass(id, updates = {}) {
    if (!this.isConfigured()) {
      return { class: null, error: new Error(NOT_CONFIGURED_MESSAGE) };
    }

    if (!id || typeof id !== 'string') {
      return { class: null, error: new Error('Class ID must be a non-empty string.') };
    }

    try {
      const { class: existingClass, error: fetchError } = await this.getClassById(id);
      if (fetchError || !existingClass) {
        return {
          class: null,
          error: fetchError ?? new Error('Class not found.'),
        };
      }

      const { classes: allClasses, error: listError } = await this.getClasses();
      if (listError) {
        return { class: null, error: listError };
      }

      const merged = {
        subject_name: updates.subject_name ?? existingClass.subject_name,
        title: updates.title ?? existingClass.title,
        weekday: updates.weekday ?? existingClass.weekday,
        start_time: updates.start_time ?? existingClass.start_time,
        end_time: updates.end_time ?? existingClass.end_time,
        room: updates.room !== undefined ? updates.room : existingClass.room,
      };

      const validation = validateClassInput(merged, {
        existingClasses: allClasses,
        excludeId: id,
      });

      if (!validation.isValid) {
        return {
          class: null,
          error: new Error(Object.values(validation.errors)[0] || 'Invalid class details.'),
          errors: validation.errors,
        };
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { class: null, error: new Error('User is not authenticated.') };
      }

      const { data, error } = await supabase
        .from('classes')
        .update(validation.sanitizedData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select(CLASS_COLUMNS)
        .single();

      if (error) {
        logger.error('Failed to update class', error.message);
        return { class: null, error };
      }

      logger.info('Class updated successfully', { id });
      return { class: data, error: null };
    } catch (err) {
      logger.error('Unexpected error in updateClass', err);
      return { class: null, error: toError(err) };
    }
  },

  /**
   * Deletes a class slot owned by the authenticated user.
   *
   * @param {string} id
   * @returns {Promise<{ success: boolean, error: Error | null }>}
   */
  async deleteClass(id) {
    if (!this.isConfigured()) {
      return { success: false, error: new Error(NOT_CONFIGURED_MESSAGE) };
    }

    if (!id || typeof id !== 'string') {
      return { success: false, error: new Error('Class ID must be a non-empty string.') };
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { success: false, error: new Error('User is not authenticated.') };
      }

      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        logger.error('Failed to delete class', error.message);
        return { success: false, error };
      }

      logger.info('Class deleted successfully', { id });
      return { success: true, error: null };
    } catch (err) {
      logger.error('Unexpected error in deleteClass', err);
      return { success: false, error: toError(err) };
    }
  },

  /**
   * Batch imports classes with deduplication to prevent duplicate entries
   * when importing a timetable multiple times.
   *
   * @param {Array<object>} classCandidates
   * @returns {Promise<{ inserted: number, skipped: number, errors: Array<string>, error: Error | null }>}
   */
  async batchImportClasses(classCandidates = []) {
    if (!this.isConfigured()) {
      return { inserted: 0, skipped: 0, errors: [], error: new Error(NOT_CONFIGURED_MESSAGE) };
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { inserted: 0, skipped: 0, errors: [], error: new Error('User is not authenticated.') };
      }

      const { classes: existingClasses, error: fetchError } = await this.getClasses();
      if (fetchError) {
        return { inserted: 0, skipped: 0, errors: [], error: fetchError };
      }

      let currentPool = [...existingClasses];
      let inserted = 0;
      let skipped = 0;
      const errors = [];

      for (const candidate of classCandidates) {
        // Check for exact duplicate: same weekday, start_time, and subject_name
        const isDuplicate = currentPool.some(
          (c) =>
            c.weekday === candidate.weekday &&
            c.start_time?.slice(0, 5) === candidate.start_time?.slice(0, 5) &&
            c.subject_name?.trim().toLowerCase() === candidate.subject_name?.trim().toLowerCase()
        );

        if (isDuplicate) {
          skipped++;
          continue;
        }

        const validation = validateClassInput(candidate, { existingClasses: currentPool });
        if (!validation.isValid) {
          const errReason = Object.values(validation.errors)[0] || 'Invalid class';
          errors.push(`${candidate.subject_name || 'Class'}: ${errReason}`);
          continue;
        }

        const payload = {
          ...validation.sanitizedData,
          user_id: user.id,
        };

        const { data, error } = await supabase
          .from('classes')
          .insert(payload)
          .select(CLASS_COLUMNS)
          .single();

        if (error) {
          errors.push(`${candidate.subject_name}: ${error.message}`);
        } else {
          inserted++;
          currentPool.push(data);
        }
      }

      return { inserted, skipped, errors, error: null };
    } catch (err) {
      logger.error('Unexpected error in batchImportClasses', err);
      return { inserted: 0, skipped: 0, errors: [], error: toError(err) };
    }
  },
};
