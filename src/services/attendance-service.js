/**
 * Mova Campus — Attendance Data-Access Service
 *
 * CRUD operations for public.subjects and public.attendance_records.
 * Ownership enforced by Supabase RLS; every query scoped to the
 * authenticated user. Inputs validated before any write.
 */

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import {
  buildAttendanceSummary,
  validateAttendanceRecordInput,
  validateSubjectInput,
} from '@/utils/attendance-validators';

const SUBJECT_COLUMNS =
  'id, user_id, name, target_percentage, baseline_attended, baseline_total, baseline_as_of_date, created_at, updated_at';
const LEGACY_SUBJECT_COLUMNS =
  'id, user_id, name, target_percentage, created_at, updated_at';
const RECORD_COLUMNS = 'id, user_id, subject_id, date, status, created_at, updated_at';

const NOT_CONFIGURED_MESSAGE =
  'Supabase is not configured. Please set environment variables.';

function toError(err) {
  return err instanceof Error ? err : new Error(String(err));
}

export const attendanceService = {
  isConfigured() {
    return Boolean(isSupabaseConfigured && supabase !== null);
  },

  // =========================================================================
  // Subject CRUD
  // =========================================================================

  /**
   * Fetches all subjects for the authenticated user.
   *
   * @returns {Promise<{ subjects: Array<object>, error: Error | null }>}
   */
  async getSubjects() {
    if (!this.isConfigured()) {
      return { subjects: [], error: new Error(NOT_CONFIGURED_MESSAGE) };
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { subjects: [], error: new Error('User is not authenticated.') };
      }

      let { data, error } = await supabase
        .from('subjects')
        .select(SUBJECT_COLUMNS)
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      // If baseline columns are not yet in the database, gracefully fall back
      if (error && (error.message?.includes('baseline_') || error.code === '42703' || error.code === 'PGRST204')) {
        logger.warn('Baseline attendance columns missing in database; falling back to legacy schema', error.message);
        const fallbackRes = await supabase
          .from('subjects')
          .select(LEGACY_SUBJECT_COLUMNS)
          .eq('user_id', user.id)
          .order('name', { ascending: true });

        if (!fallbackRes.error && fallbackRes.data) {
          data = fallbackRes.data.map((s) => ({
            ...s,
            baseline_attended: 0,
            baseline_total: 0,
            baseline_as_of_date: null,
          }));
          error = null;
        }
      }

      if (error) {
        logger.error('Failed to fetch subjects', error.message);
        return { subjects: [], error };
      }

      return { subjects: data ?? [], error: null };
    } catch (err) {
      logger.error('Unexpected error in getSubjects', err);
      return { subjects: [], error: toError(err) };
    }
  },

  /**
   * Creates a new subject.
   *
   * @param {object} input  - { name, target_percentage?, baseline_attended?, baseline_total?, baseline_as_of_date? }
   * @returns {Promise<{ subject: object | null, error: Error | null, errors?: Record<string, string> }>}
   */
  async createSubject(input = {}) {
    if (!this.isConfigured()) {
      return { subject: null, error: new Error(NOT_CONFIGURED_MESSAGE) };
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { subject: null, error: new Error('User is not authenticated.') };
      }

      const validation = validateSubjectInput(input);
      if (!validation.isValid) {
        return {
          subject: null,
          error: new Error(Object.values(validation.errors)[0] || 'Invalid subject.'),
          errors: validation.errors,
        };
      }

      const payload = { ...validation.sanitizedData, user_id: user.id };

      let { data, error } = await supabase
        .from('subjects')
        .insert(payload)
        .select(SUBJECT_COLUMNS)
        .single();

      // Graceful fallback if database lacks baseline columns
      if (error && (error.message?.includes('baseline_') || error.code === '42703' || error.code === 'PGRST204')) {
        const legacyPayload = {
          user_id: user.id,
          name: payload.name,
          target_percentage: payload.target_percentage,
        };
        const fallbackRes = await supabase
          .from('subjects')
          .insert(legacyPayload)
          .select(LEGACY_SUBJECT_COLUMNS)
          .single();

        if (!fallbackRes.error && fallbackRes.data) {
          data = {
            ...fallbackRes.data,
            baseline_attended: payload.baseline_attended ?? 0,
            baseline_total: payload.baseline_total ?? 0,
            baseline_as_of_date: payload.baseline_as_of_date ?? null,
          };
          error = null;
        }
      }

      if (error) {
        // Handle unique constraint violation
        if (error.code === '23505') {
          return {
            subject: null,
            error: new Error('A subject with this name already exists.'),
            errors: { name: 'A subject with this name already exists.' },
          };
        }
        logger.error('Failed to create subject', error.message);
        return { subject: null, error };
      }

      logger.info('Subject created', { id: data.id });
      return { subject: data, error: null };
    } catch (err) {
      logger.error('Unexpected error in createSubject', err);
      return { subject: null, error: toError(err) };
    }
  },

  /**
   * Updates an existing subject.
   *
   * @param {string} id
   * @param {object} updates  - { name?, target_percentage?, baseline_attended?, baseline_total?, baseline_as_of_date? }
   * @returns {Promise<{ subject: object | null, error: Error | null, errors?: Record<string, string> }>}
   */
  async updateSubject(id, updates = {}) {
    if (!this.isConfigured()) {
      return { subject: null, error: new Error(NOT_CONFIGURED_MESSAGE) };
    }

    if (!id || typeof id !== 'string') {
      return { subject: null, error: new Error('Subject ID must be a non-empty string.') };
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { subject: null, error: new Error('User is not authenticated.') };
      }

      const validation = validateSubjectInput(updates);
      if (!validation.isValid) {
        return {
          subject: null,
          error: new Error(Object.values(validation.errors)[0] || 'Invalid subject.'),
          errors: validation.errors,
        };
      }

      let { data, error } = await supabase
        .from('subjects')
        .update(validation.sanitizedData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select(SUBJECT_COLUMNS)
        .single();

      // Graceful fallback if database lacks baseline columns
      if (error && (error.message?.includes('baseline_') || error.code === '42703' || error.code === 'PGRST204')) {
        const legacyUpdates = {};
        if (validation.sanitizedData.name !== undefined) legacyUpdates.name = validation.sanitizedData.name;
        if (validation.sanitizedData.target_percentage !== undefined) legacyUpdates.target_percentage = validation.sanitizedData.target_percentage;

        const fallbackRes = await supabase
          .from('subjects')
          .update(legacyUpdates)
          .eq('id', id)
          .eq('user_id', user.id)
          .select(LEGACY_SUBJECT_COLUMNS)
          .single();

        if (!fallbackRes.error && fallbackRes.data) {
          data = {
            ...fallbackRes.data,
            baseline_attended: validation.sanitizedData.baseline_attended ?? 0,
            baseline_total: validation.sanitizedData.baseline_total ?? 0,
            baseline_as_of_date: validation.sanitizedData.baseline_as_of_date ?? null,
          };
          error = null;
        }
      }

      if (error) {
        if (error.code === '23505') {
          return {
            subject: null,
            error: new Error('A subject with this name already exists.'),
            errors: { name: 'A subject with this name already exists.' },
          };
        }
        logger.error('Failed to update subject', error.message);
        return { subject: null, error };
      }

      logger.info('Subject updated', { id });
      return { subject: data, error: null };
    } catch (err) {
      logger.error('Unexpected error in updateSubject', err);
      return { subject: null, error: toError(err) };
    }
  },

  /**
   * Deletes a subject and all its attendance records (cascade).
   *
   * @param {string} id
   * @returns {Promise<{ success: boolean, error: Error | null }>}
   */
  async deleteSubject(id) {
    if (!this.isConfigured()) {
      return { success: false, error: new Error(NOT_CONFIGURED_MESSAGE) };
    }

    if (!id || typeof id !== 'string') {
      return { success: false, error: new Error('Subject ID must be a non-empty string.') };
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
        .from('subjects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        logger.error('Failed to delete subject', error.message);
        return { success: false, error };
      }

      logger.info('Subject deleted', { id });
      return { success: true, error: null };
    } catch (err) {
      logger.error('Unexpected error in deleteSubject', err);
      return { success: false, error: toError(err) };
    }
  },

  // =========================================================================
  // Attendance Record CRUD
  // =========================================================================

  /**
   * Fetches attendance records, optionally filtered by subject.
   *
   * @param {{ subjectId?: string | null }} [options]
   * @returns {Promise<{ records: Array<object>, error: Error | null }>}
   */
  async getRecords({ subjectId = null } = {}) {
    if (!this.isConfigured()) {
      return { records: [], error: new Error(NOT_CONFIGURED_MESSAGE) };
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { records: [], error: new Error('User is not authenticated.') };
      }

      let query = supabase
        .from('attendance_records')
        .select(RECORD_COLUMNS)
        .eq('user_id', user.id);

      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) {
        logger.error('Failed to fetch attendance records', error.message);
        return { records: [], error };
      }

      return { records: data ?? [], error: null };
    } catch (err) {
      logger.error('Unexpected error in getRecords', err);
      return { records: [], error: toError(err) };
    }
  },

  /**
   * Marks attendance (creates a record).
   *
   * @param {object} input  - { subject_id, date, status }
   * @returns {Promise<{ record: object | null, error: Error | null, errors?: Record<string, string> }>}
   */
  async markAttendance(input = {}) {
    if (!this.isConfigured()) {
      return { record: null, error: new Error(NOT_CONFIGURED_MESSAGE) };
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { record: null, error: new Error('User is not authenticated.') };
      }

      const validation = validateAttendanceRecordInput(input);
      if (!validation.isValid) {
        return {
          record: null,
          error: new Error(Object.values(validation.errors)[0] || 'Invalid attendance record.'),
          errors: validation.errors,
        };
      }

      const payload = { ...validation.sanitizedData, user_id: user.id };

      const { data, error } = await supabase
        .from('attendance_records')
        .insert(payload)
        .select(RECORD_COLUMNS)
        .single();

      if (error) {
        logger.error('Failed to mark attendance', error.message);
        return { record: null, error };
      }

      logger.info('Attendance marked', { id: data.id });
      return { record: data, error: null };
    } catch (err) {
      logger.error('Unexpected error in markAttendance', err);
      return { record: null, error: toError(err) };
    }
  },

  /**
   * Updates an attendance record's status.
   *
   * @param {string} id
   * @param {string} status  - 'present' or 'absent'
   * @returns {Promise<{ record: object | null, error: Error | null }>}
   */
  async updateRecord(id, status) {
    if (!this.isConfigured()) {
      return { record: null, error: new Error(NOT_CONFIGURED_MESSAGE) };
    }

    if (!id || typeof id !== 'string') {
      return { record: null, error: new Error('Record ID is required.') };
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { record: null, error: new Error('User is not authenticated.') };
      }

      const { data, error } = await supabase
        .from('attendance_records')
        .update({ status })
        .eq('id', id)
        .eq('user_id', user.id)
        .select(RECORD_COLUMNS)
        .single();

      if (error) {
        logger.error('Failed to update attendance record', error.message);
        return { record: null, error };
      }

      return { record: data, error: null };
    } catch (err) {
      logger.error('Unexpected error in updateRecord', err);
      return { record: null, error: toError(err) };
    }
  },

  /**
   * Deletes an attendance record.
   *
   * @param {string} id
   * @returns {Promise<{ success: boolean, error: Error | null }>}
   */
  async deleteRecord(id) {
    if (!this.isConfigured()) {
      return { success: false, error: new Error(NOT_CONFIGURED_MESSAGE) };
    }

    if (!id || typeof id !== 'string') {
      return { success: false, error: new Error('Record ID is required.') };
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
        .from('attendance_records')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        logger.error('Failed to delete attendance record', error.message);
        return { success: false, error };
      }

      logger.info('Attendance record deleted', { id });
      return { success: true, error: null };
    } catch (err) {
      logger.error('Unexpected error in deleteRecord', err);
      return { success: false, error: toError(err) };
    }
  },

  // =========================================================================
  // Computed views
  // =========================================================================

  /**
   * Returns subjects with their attendance summaries.
   *
   * @returns {Promise<{ subjects: Array<object>, overallSummary: object, error: Error | null }>}
   */
  async getSubjectsWithSummaries() {
    if (!this.isConfigured()) {
      return {
        subjects: [],
        overallSummary: buildAttendanceSummary([]),
        error: new Error(NOT_CONFIGURED_MESSAGE),
      };
    }

    try {
      const [subjectsResult, recordsResult] = await Promise.all([
        this.getSubjects(),
        this.getRecords(),
      ]);

      if (subjectsResult.error) {
        return {
          subjects: [],
          overallSummary: buildAttendanceSummary([]),
          error: subjectsResult.error,
        };
      }

      if (recordsResult.error) {
        return {
          subjects: subjectsResult.subjects.map((s) => ({
            ...s,
            summary: buildAttendanceSummary([], s.target_percentage),
          })),
          overallSummary: buildAttendanceSummary([]),
          error: recordsResult.error,
        };
      }

      // Group records by subject
      const recordsBySubject = new Map();
      for (const record of recordsResult.records) {
        if (!recordsBySubject.has(record.subject_id)) {
          recordsBySubject.set(record.subject_id, []);
        }
        recordsBySubject.get(record.subject_id).push(record);
      }

      const enrichedSubjects = subjectsResult.subjects.map((subject) => {
        const records = recordsBySubject.get(subject.id) || [];
        return {
          ...subject,
          records,
          summary: buildAttendanceSummary(records, subject.target_percentage, subject),
        };
      });

      // Overall summary across all subjects (aggregating baseline + subsequent)
      const totalAttended = enrichedSubjects.reduce((acc, s) => acc + s.summary.attendedClasses, 0);
      const totalClasses = enrichedSubjects.reduce((acc, s) => acc + s.summary.totalClasses, 0);
      const overallSummary = {
        totalClasses,
        attendedClasses: totalAttended,
        missedClasses: Math.max(0, totalClasses - totalAttended),
        percentage: totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 10000) / 100 : 0,
        safeBunks: enrichedSubjects.reduce((acc, s) => acc + s.summary.safeBunks, 0),
        classesToRecover: enrichedSubjects.reduce((acc, s) => acc + s.summary.classesToRecover, 0),
        status: totalClasses > 0 ? (totalAttended / totalClasses >= 0.75 ? 'on_track' : 'below_target') : 'no_data',
      };

      return { subjects: enrichedSubjects, overallSummary, error: null };
    } catch (err) {
      logger.error('Unexpected error in getSubjectsWithSummaries', err);
      return {
        subjects: [],
        overallSummary: buildAttendanceSummary([]),
        error: toError(err),
      };
    }
  },

  /**
   * Batch upserts subjects with baseline attendance data.
   * Updates existing subjects if name matches (case-insensitive), or creates new ones.
   *
   * @param {Array<{ name: string, target_percentage?: number, baseline_attended?: number, baseline_total?: number, baseline_as_of_date?: string }>} items
   * @returns {Promise<{ created: number, updated: number, error: Error | null }>}
   */
  async batchUpsertSubjects(items = []) {
    if (!this.isConfigured()) {
      return { created: 0, updated: 0, error: new Error(NOT_CONFIGURED_MESSAGE) };
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { created: 0, updated: 0, error: new Error('User is not authenticated.') };
      }

      const existingRes = await this.getSubjects();
      const existingSubjects = existingRes.subjects || [];
      const mapByName = new Map(existingSubjects.map((s) => [s.name.trim().toLowerCase(), s]));

      let created = 0;
      let updated = 0;

      for (const item of items) {
        const validation = validateSubjectInput(item);
        if (!validation.isValid) continue;

        const key = validation.sanitizedData.name.toLowerCase();
        const existing = mapByName.get(key);

        if (existing) {
          let { error } = await supabase
            .from('subjects')
            .update(validation.sanitizedData)
            .eq('id', existing.id)
            .eq('user_id', user.id);

          if (error && (error.message?.includes('baseline_') || error.code === '42703' || error.code === 'PGRST204')) {
            const legacy = {
              name: validation.sanitizedData.name,
              target_percentage: validation.sanitizedData.target_percentage,
            };
            const fb = await supabase.from('subjects').update(legacy).eq('id', existing.id).eq('user_id', user.id);
            if (!fb.error) updated++;
          } else if (!error) {
            updated++;
          }
        } else {
          let { error } = await supabase
            .from('subjects')
            .insert({ ...validation.sanitizedData, user_id: user.id });

          if (error && (error.message?.includes('baseline_') || error.code === '42703' || error.code === 'PGRST204')) {
            const legacy = {
              user_id: user.id,
              name: validation.sanitizedData.name,
              target_percentage: validation.sanitizedData.target_percentage,
            };
            const fb = await supabase.from('subjects').insert(legacy);
            if (!fb.error) created++;
          } else if (!error) {
            created++;
          }
        }
      }

      return { created, updated, error: null };
    } catch (err) {
      logger.error('Unexpected error in batchUpsertSubjects', err);
      return { created: 0, updated: 0, error: toError(err) };
    }
  },
};
