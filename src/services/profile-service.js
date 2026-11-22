/**
 * Mova Profile Data-Access Service
 *
 * Implements CRUD operations for public.profiles linked to auth.users.
 * Enforces ownership, derives age dynamically, validates input,
 * handles social/privacy fields, and avoids logging sensitive profile data.
 */

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import {
  calculateAge,
  validateAvatarUrl,
  validateDateOfBirth,
  validateDisplayName,
  validateProfileInput,
} from '@/utils/profile-validators';

const FULL_PROFILE_COLUMNS =
  'id, name, username, bio, date_of_birth, avatar_url, friend_code, is_discoverable, is_streak_public, is_points_public, total_points, current_level, created_at, updated_at';

const LEGACY_PROFILE_COLUMNS =
  'id, name, date_of_birth, avatar_url, created_at, updated_at';

export const profileService = {
  isConfigured() {
    return isSupabaseConfigured && supabase !== null;
  },

  /**
   * Fetches the profile of the currently authenticated user with graceful fallback.
   */
  async getProfile() {
    if (!this.isConfigured()) {
      return {
        profile: null,
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
          profile: null,
          error: new Error('User is not authenticated.'),
        };
      }

      // Try fetching full profile columns
      let { data, error } = await supabase
        .from('profiles')
        .select(FULL_PROFILE_COLUMNS)
        .eq('id', user.id)
        .maybeSingle();

      // If missing columns (e.g. database not migrated yet), fallback to legacy columns
      if (error && (error.code === '42703' || error.message?.includes('does not exist'))) {
        logger.warn('Profiles table missing extended columns; using legacy columns fallback.');
        const fallback = await supabase
          .from('profiles')
          .select(LEGACY_PROFILE_COLUMNS)
          .eq('id', user.id)
          .maybeSingle();

        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        return { profile: null, error };
      }

      if (!data) {
        return { profile: null, error: null };
      }

      // Auto-assign friend code if null
      const friendCode = data.friend_code || `MOVA-${data.id.slice(0, 6).toUpperCase()}`;

      return {
        profile: {
          ...data,
          username: data.username || (data.name ? data.name.toLowerCase().replace(/[^a-z0-9_]/g, '') : 'student'),
          friend_code: friendCode,
          is_discoverable: data.is_discoverable !== false,
          is_streak_public: data.is_streak_public !== false,
          is_points_public: data.is_points_public !== false,
          total_points: data.total_points || 0,
          current_level: data.current_level || 1,
          age: calculateAge(data.date_of_birth),
        },
        error: null,
      };
    } catch (err) {
      return {
        profile: null,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  },

  /**
   * Creates a new profile for the currently authenticated user.
   */
  async createProfile(input = {}) {
    if (!this.isConfigured()) {
      return {
        profile: null,
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
          profile: null,
          error: new Error('User is not authenticated.'),
        };
      }

      const validation = validateProfileInput(input);
      if (!validation.isValid) {
        const firstErrorMessage =
          Object.values(validation.errors)[0] || 'Invalid profile information.';
        return {
          profile: null,
          error: new Error(firstErrorMessage),
          errors: validation.errors,
        };
      }

      const payload = {
        id: user.id,
        name: validation.sanitizedData.name,
        date_of_birth: validation.sanitizedData.date_of_birth,
        avatar_url: validation.sanitizedData.avatar_url,
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert(payload)
        .select(LEGACY_PROFILE_COLUMNS)
        .single();

      if (error) {
        return { profile: null, error };
      }

      return {
        profile: {
          ...data,
          age: calculateAge(data.date_of_birth),
        },
        error: null,
      };
    } catch (err) {
      return {
        profile: null,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  },

  /**
   * Updates editable profile fields for the currently authenticated user.
   */
  async updateProfile(updates = {}) {
    if (!this.isConfigured()) {
      return {
        profile: null,
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
          profile: null,
          error: new Error('User is not authenticated.'),
        };
      }

      if (!updates || typeof updates !== 'object') {
        return {
          profile: null,
          error: new Error('Updates must be a valid object.'),
        };
      }

      const sanitizedUpdates = {};
      const errors = {};

      if (updates.name !== undefined) {
        const nameVal = validateDisplayName(updates.name);
        if (!nameVal.isValid) {
          errors.name = nameVal.error;
        } else {
          sanitizedUpdates.name = nameVal.sanitizedValue;
        }
      }

      if (updates.username !== undefined) {
        const cleanUser = String(updates.username || '').trim().toLowerCase();
        if (cleanUser && !/^[a-z0-9_]{3,30}$/.test(cleanUser)) {
          errors.username = 'Username must be 3-30 alphanumeric characters or underscores.';
        } else {
          sanitizedUpdates.username = cleanUser || null;
        }
      }

      if (updates.bio !== undefined) {
        sanitizedUpdates.bio = String(updates.bio || '').slice(0, 300);
      }

      if (updates.is_discoverable !== undefined) {
        sanitizedUpdates.is_discoverable = Boolean(updates.is_discoverable);
      }

      if (updates.is_streak_public !== undefined) {
        sanitizedUpdates.is_streak_public = Boolean(updates.is_streak_public);
      }

      if (updates.is_points_public !== undefined) {
        sanitizedUpdates.is_points_public = Boolean(updates.is_points_public);
      }

      if (updates.date_of_birth !== undefined) {
        const dobVal = validateDateOfBirth(updates.date_of_birth);
        if (!dobVal.isValid) {
          errors.date_of_birth = dobVal.error;
        } else {
          sanitizedUpdates.date_of_birth = dobVal.sanitizedValue;
        }
      }

      if (updates.avatar_url !== undefined) {
        const avatarVal = validateAvatarUrl(updates.avatar_url);
        if (!avatarVal.isValid) {
          errors.avatar_url = avatarVal.error;
        } else {
          sanitizedUpdates.avatar_url = avatarVal.sanitizedValue;
        }
      }

      if (Object.keys(errors).length > 0) {
        const firstErrorMessage =
          Object.values(errors)[0] || 'Invalid profile information provided.';
        return {
          profile: null,
          error: new Error(firstErrorMessage),
          errors,
        };
      }

      if (Object.keys(sanitizedUpdates).length === 0) {
        return this.getProfile();
      }

      // Try update with all sanitized fields
      let { data, error } = await supabase
        .from('profiles')
        .update(sanitizedUpdates)
        .eq('id', user.id)
        .select()
        .maybeSingle();

      // Fallback if extended fields failed
      if (error && (error.code === '42703' || error.message?.includes('does not exist'))) {
        const legacyUpdates = {};
        if (sanitizedUpdates.name !== undefined) legacyUpdates.name = sanitizedUpdates.name;
        if (sanitizedUpdates.date_of_birth !== undefined) legacyUpdates.date_of_birth = sanitizedUpdates.date_of_birth;
        if (sanitizedUpdates.avatar_url !== undefined) legacyUpdates.avatar_url = sanitizedUpdates.avatar_url;

        const fallback = await supabase
          .from('profiles')
          .update(legacyUpdates)
          .eq('id', user.id)
          .select(LEGACY_PROFILE_COLUMNS)
          .single();

        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        return { profile: null, error };
      }

      return {
        profile: {
          ...data,
          age: calculateAge(data.date_of_birth),
        },
        error: null,
      };
    } catch (err) {
      return {
        profile: null,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  },

  /**
   * Uploads an avatar image file to Supabase Storage (bucket 'avatars')
   * with fallback to base64 preview URL.
   */
  async uploadAvatar(file) {
    if (!this.isConfigured() || !file) {
      return { avatar_url: null, error: new Error('Missing file or configuration') };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { avatar_url: null, error: new Error('Unauthenticated') };

      const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to avatars bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        logger.warn('Storage upload error, using object URL fallback:', uploadError.message);
        if (typeof window !== 'undefined' && window.URL && window.URL.createObjectURL) {
          const localUrl = window.URL.createObjectURL(file);
          await this.updateProfile({ avatar_url: localUrl });
          return { avatar_url: localUrl, error: null };
        }
        return { avatar_url: null, error: uploadError };
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await this.updateProfile({ avatar_url: publicUrl });

      return { avatar_url: publicUrl, error: null };
    } catch (err) {
      return { avatar_url: null, error: err };
    }
  },

  /**
   * Removes current avatar.
   */
  async removeAvatar() {
    return this.updateProfile({ avatar_url: null });
  },
};
