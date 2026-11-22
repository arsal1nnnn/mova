/**
 * Mova Task Data-Access Service
 *
 * Implements CRUD operations, completion toggling, recurrence advancement,
 * and filtering for public.tasks linked to auth.users.
 * Enforces ownership via Supabase RLS and authenticated user ID,
 * validates inputs, and ensures error safety.
 */

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import {
  calculateNextDueDate,
  validateCategory,
  validateDueDate,
  validateDueTime,
  validateEstimatedDuration,
  validatePriority,
  validateRecurrence,
  validateTaskDescription,
  validateTaskInput,
  validateTaskTitle,
} from '@/utils/task-validators';

export const taskService = {
  isConfigured() {
    return Boolean(isSupabaseConfigured && supabase !== null);
  },

  /**
   * Retrieves tasks for the authenticated user with optional filtering and ordering.
   *
   * @param {object} [options]
   * @param {'all' | 'pending' | 'upcoming' | 'completed'} [options.status='all']
   * @param {string | null} [options.category=null]
   * @param {string | null} [options.priority=null]
   * @param {string} [options.search='']
   * @param {string} [options.sortBy='due_date']
   * @param {'asc' | 'desc'} [options.sortOrder='asc']
   * @returns {Promise<{ tasks: Array<object>, error: Error | null }>}
   */
  async getTasks({
    status = 'all',
    category = null,
    priority = null,
    search = '',
    sortBy = 'due_date',
    sortOrder = 'asc',
  } = {}) {
    if (!this.isConfigured()) {
      return {
        tasks: [],
        error: new Error('Supabase is not configured. Please set environment variables.'),
      };
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return {
          tasks: [],
          error: new Error('User is not authenticated.'),
        };
      }

      let query = supabase.from('tasks').select('*').eq('user_id', user.id);

      // Status filters
      const todayString = new Date().toISOString().slice(0, 10);
      if (status === 'pending') {
        query = query.eq('is_completed', false);
      } else if (status === 'upcoming') {
        query = query.eq('is_completed', false).gte('due_date', todayString);
      } else if (status === 'completed') {
        query = query.eq('is_completed', true);
      }

      // Category and Priority filters
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }
      if (priority && priority !== 'all') {
        query = query.eq('priority', priority);
      }

      // Text search
      const trimmedSearch = typeof search === 'string' ? search.trim() : '';
      if (trimmedSearch.length > 0) {
        // Search title and description via Postgres ilike
        query = query.or(`title.ilike.%${trimmedSearch}%,description.ilike.%${trimmedSearch}%`);
      }

      // Ordering
      const isAsc = sortOrder === 'asc';
      if (sortBy === 'due_date') {
        // Due date sorting with secondary ordering by due_time and created_at
        query = query
          .order('due_date', { ascending: isAsc, nullsFirst: false })
          .order('due_time', { ascending: isAsc, nullsFirst: false })
          .order('created_at', { ascending: false });
      } else {
        query = query.order(sortBy, { ascending: isAsc });
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to fetch tasks', error.message);
        return { tasks: [], error };
      }

      return { tasks: data ?? [], error: null };
    } catch (err) {
      logger.error('Unexpected error in getTasks', err);
      return {
        tasks: [],
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  },

  /**
   * Fetches a single task by ID for the current authenticated user.
   *
   * @param {string} id
   * @returns {Promise<{ task: object | null, error: Error | null }>}
   */
  async getTaskById(id) {
    if (!this.isConfigured()) {
      return {
        task: null,
        error: new Error('Supabase is not configured. Please set environment variables.'),
      };
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { task: null, error: new Error('User is not authenticated.') };
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        logger.error('Failed to get task by id', error.message);
        return { task: null, error };
      }

      return { task: data, error: null };
    } catch (err) {
      return {
        task: null,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  },

  /**
   * Creates a new task for the current authenticated user.
   *
   * @param {object} input
   * @returns {Promise<{ task: object | null, error: Error | null, errors?: Record<string, string> }>}
   */
  async createTask(input = {}) {
    if (!this.isConfigured()) {
      return {
        task: null,
        error: new Error('Supabase is not configured. Please set environment variables.'),
      };
    }

    const validation = validateTaskInput(input);
    if (!validation.isValid) {
      return {
        task: null,
        error: new Error('Task input validation failed.'),
        errors: validation.errors,
      };
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { task: null, error: new Error('User is not authenticated.') };
      }

      const payload = {
        ...validation.sanitizedData,
        user_id: user.id,
        recurrence_interval:
          typeof input.recurrence_interval === 'number' && input.recurrence_interval >= 1
            ? Math.min(Math.floor(input.recurrence_interval), 365)
            : 1,
        is_completed: false,
        completed_at: null,
      };

      const { data, error } = await supabase.from('tasks').insert(payload).select().single();

      if (error) {
        logger.error('Failed to insert task', error.message);
        return { task: null, error };
      }

      logger.info('Task created successfully', { id: data.id });
      return { task: data, error: null };
    } catch (err) {
      logger.error('Unexpected error in createTask', err);
      return {
        task: null,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  },

  /**
   * Updates an existing task for the current authenticated user.
   *
   * @param {string} id
   * @param {object} updates
   * @returns {Promise<{ task: object | null, error: Error | null, errors?: Record<string, string> }>}
   */
  async updateTask(id, updates = {}) {
    if (!this.isConfigured()) {
      return {
        task: null,
        error: new Error('Supabase is not configured. Please set environment variables.'),
      };
    }

    if (!id || typeof id !== 'string') {
      return { task: null, error: new Error('Task ID must be a non-empty string.') };
    }

    const sanitizedUpdates = {};
    const errors = {};

    if (updates.title !== undefined) {
      const v = validateTaskTitle(updates.title);
      if (!v.isValid) errors.title = v.error;
      else sanitizedUpdates.title = v.sanitizedValue;
    }

    if (updates.description !== undefined) {
      const v = validateTaskDescription(updates.description);
      if (!v.isValid) errors.description = v.error;
      else sanitizedUpdates.description = v.sanitizedValue;
    }

    if (updates.due_date !== undefined) {
      const v = validateDueDate(updates.due_date);
      if (!v.isValid) errors.due_date = v.error;
      else sanitizedUpdates.due_date = v.sanitizedValue;
    }

    if (updates.due_time !== undefined) {
      const v = validateDueTime(updates.due_time);
      if (!v.isValid) errors.due_time = v.error;
      else sanitizedUpdates.due_time = v.sanitizedValue;
    }

    if (updates.priority !== undefined) {
      const v = validatePriority(updates.priority);
      if (!v.isValid) errors.priority = v.error;
      else sanitizedUpdates.priority = v.sanitizedValue;
    }

    if (updates.category !== undefined) {
      const v = validateCategory(updates.category);
      if (!v.isValid) errors.category = v.error;
      else sanitizedUpdates.category = v.sanitizedValue;
    }

    if (updates.estimated_duration !== undefined) {
      const v = validateEstimatedDuration(updates.estimated_duration);
      if (!v.isValid) errors.estimated_duration = v.error;
      else sanitizedUpdates.estimated_duration = v.sanitizedValue;
    }

    if (updates.recurrence !== undefined) {
      const v = validateRecurrence(updates.recurrence);
      if (!v.isValid) errors.recurrence = v.error;
      else sanitizedUpdates.recurrence = v.sanitizedValue;
    }

    if (updates.recurrence_interval !== undefined) {
      if (
        typeof updates.recurrence_interval === 'number' &&
        updates.recurrence_interval >= 1 &&
        updates.recurrence_interval <= 365
      ) {
        sanitizedUpdates.recurrence_interval = Math.floor(updates.recurrence_interval);
      } else {
        errors.recurrence_interval = 'Recurrence interval must be an integer between 1 and 365.';
      }
    }

    if (updates.is_completed !== undefined) {
      sanitizedUpdates.is_completed = Boolean(updates.is_completed);
      sanitizedUpdates.completed_at = sanitizedUpdates.is_completed
        ? new Date().toISOString()
        : null;
    }

    if (Object.keys(errors).length > 0) {
      return {
        task: null,
        error: new Error('Task update validation failed.'),
        errors,
      };
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { task: null, error: new Error('User is not authenticated.') };
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(sanitizedUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update task', error.message);
        return { task: null, error };
      }

      logger.info('Task updated successfully', { id });
      return { task: data, error: null };
    } catch (err) {
      logger.error('Unexpected error in updateTask', err);
      return {
        task: null,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  },

  /**
   * Marks a task completed.
   * If the task is recurring, automatically calculates and generates the next occurrence.
   *
   * @param {string} id
   * @returns {Promise<{ task: object | null, nextTask: object | null, error: Error | null }>}
   */
  async completeTask(id) {
    if (!this.isConfigured()) {
      return {
        task: null,
        nextTask: null,
        error: new Error('Supabase is not configured. Please set environment variables.'),
      };
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { task: null, nextTask: null, error: new Error('User is not authenticated.') };
      }

      // Fetch the existing task first to inspect recurrence details
      const { data: existingTask, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !existingTask) {
        return {
          task: null,
          nextTask: null,
          error: fetchError ?? new Error('Task not found.'),
        };
      }

      const completedAt = new Date().toISOString();

      // Mark current task completed
      const { data: updatedTask, error: updateError } = await supabase
        .from('tasks')
        .update({
          is_completed: true,
          completed_at: completedAt,
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        logger.error('Failed to complete task', updateError.message);
        return { task: null, nextTask: null, error: updateError };
      }

      let createdNextTask = null;

      // Handle recurrence generation
      if (existingTask.recurrence && existingTask.recurrence !== 'none') {
        const todayIso = completedAt.slice(0, 10);
        const baseDate = existingTask.due_date || todayIso;
        const nextDueDate = calculateNextDueDate(
          baseDate,
          existingTask.recurrence,
          existingTask.recurrence_interval || 1
        );

        if (nextDueDate) {
          const nextTaskPayload = {
            user_id: user.id,
            title: existingTask.title,
            description: existingTask.description,
            due_date: nextDueDate,
            due_time: existingTask.due_time,
            priority: existingTask.priority,
            category: existingTask.category,
            estimated_duration: existingTask.estimated_duration,
            recurrence: existingTask.recurrence,
            recurrence_interval: existingTask.recurrence_interval || 1,
            is_completed: false,
            completed_at: null,
          };

          const { data: nextTaskData, error: nextTaskError } = await supabase
            .from('tasks')
            .insert(nextTaskPayload)
            .select()
            .single();

          if (nextTaskError) {
            logger.warn('Failed to auto-generate next recurring task', nextTaskError.message);
          } else {
            createdNextTask = nextTaskData;
            logger.info('Generated next recurring task occurrence', {
              id: createdNextTask?.id,
              due_date: nextDueDate,
            });
          }
        }
      }

      return {
        task: updatedTask,
        nextTask: createdNextTask,
        error: null,
      };
    } catch (err) {
      logger.error('Unexpected error in completeTask', err);
      return {
        task: null,
        nextTask: null,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  },

  /**
   * Reverses task completion (undo complete).
   *
   * @param {string} id
   * @returns {Promise<{ task: object | null, error: Error | null }>}
   */
  async undoCompleteTask(id) {
    if (!this.isConfigured()) {
      return {
        task: null,
        error: new Error('Supabase is not configured. Please set environment variables.'),
      };
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { task: null, error: new Error('User is not authenticated.') };
      }

      const { data, error } = await supabase
        .from('tasks')
        .update({
          is_completed: false,
          completed_at: null,
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        logger.error('Failed to undo complete task', error.message);
        return { task: null, error };
      }

      logger.info('Undid task completion', { id });
      return { task: data, error: null };
    } catch (err) {
      logger.error('Unexpected error in undoCompleteTask', err);
      return {
        task: null,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  },

  /**
   * Deletes a task by ID for the current authenticated user.
   *
   * @param {string} id
   * @returns {Promise<{ success: boolean, error: Error | null }>}
   */
  async deleteTask(id) {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: new Error('Supabase is not configured. Please set environment variables.'),
      };
    }

    if (!id || typeof id !== 'string') {
      return {
        success: false,
        error: new Error('Task ID must be a non-empty string.'),
      };
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
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        logger.error('Failed to delete task', error.message);
        return { success: false, error };
      }

      logger.info('Task deleted successfully', { id });
      return { success: true, error: null };
    } catch (err) {
      logger.error('Unexpected error in deleteTask', err);
      return {
        success: false,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  },
};
