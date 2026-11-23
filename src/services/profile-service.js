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
  generateSuggestedUsername,
  validateAvatarUrl,
  validateDateOfBirth,
  validateDisplayName,
  validateProfileInput,
  validateUsername,
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

      // Extract OAuth / Google account metadata if present
      const googleName =
        user.user_metadata?.full_name?.trim() ||
        user.user_metadata?.name?.trim() ||
        (user.email ? user.email.split('@')[0] : 'Student');
      const googleAvatar =
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        null;

      if (!data) {
        // Automatically prefill profile from Google metadata if first time sign-in
        const initialUsername = generateSuggestedUsername(googleName || user.email);
        const initialFriendCode = `MOVA-${user.id.slice(0, 6).toUpperCase()}`;

        const freshProfile = {
          id: user.id,
          name: googleName,
          username: initialUsername,
          avatar_url: googleAvatar,
          friend_code: initialFriendCode,
          is_discoverable: true,
          is_streak_public: true,
          is_points_public: true,
          total_points: 0,
          current_level: 1,
        };

        // Try upserting asynchronously
        supabase.from('profiles').upsert(freshProfile).then(() => {});

        return {
          profile: {
            ...freshProfile,
            age: null,
          },
          error: null,
        };
      }

      // Resolve effective display name: use Google name if stored name is empty or fallback "Student"
      const effectiveName =
        data.name && data.name !== 'Student'
          ? data.name
          : googleName && googleName !== 'Student'
          ? googleName
          : data.name || 'Student';

      const effectiveAvatar = data.avatar_url || googleAvatar;
      const effectiveUsername = data.username || generateSuggestedUsername(effectiveName || user.email);
      const friendCode = data.friend_code || `MOVA-${data.id.slice(0, 6).toUpperCase()}`;

      return {
        profile: {
          ...data,
          name: effectiveName,
          avatar_url: effectiveAvatar,
          username: effectiveUsername,
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
   * Checks whether a username is available in the database.
   *
   * @param {string} username
   * @param {string|null} [excludeUserId=null]
   * @returns {Promise<{ available: boolean, error?: string, sanitizedValue?: string, wasTransformed?: boolean }>}
   */
  async checkUsernameAvailability(username, excludeUserId = null) {
    if (!this.isConfigured()) return { available: true };

    const validation = validateUsername(username);
    if (!validation.isValid) {
      return {
        available: false,
        error: validation.error,
        sanitizedValue: validation.sanitizedValue,
        wasTransformed: validation.wasTransformed,
      };
    }

    try {
      let query = supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', validation.sanitizedValue);

      if (excludeUserId) {
        query = query.neq('id', excludeUserId);
      }

      const { data, error } = await query;
      if (error) {
        return { available: false, error: error.message };
      }

      const available = !data || data.length === 0;
      return {
        available,
        sanitizedValue: validation.sanitizedValue,
        wasTransformed: validation.wasTransformed,
        error: available ? null : 'This username is already taken. Please choose another.',
      };
    } catch (err) {
      return { available: false, error: err.message };
    }
  },

  /**
   * Suggests an available username given a display name or email.
   *
   * @param {string} nameOrEmail
   * @returns {Promise<string>}
   */
  async suggestUsername(nameOrEmail) {
    let candidate = generateSuggestedUsername(nameOrEmail);
    const { available } = await this.checkUsernameAvailability(candidate);
    if (available) return candidate;

    // Append random number if taken
    for (let i = 0; i < 5; i++) {
      candidate = generateSuggestedUsername(`${nameOrEmail}${Math.floor(10 + Math.random() * 90)}`);
      const res = await this.checkUsernameAvailability(candidate);
      if (res.available) return candidate;
    }
    return candidate;
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
        if (!updates.username) {
          sanitizedUpdates.username = null;
        } else {
          const userVal = validateUsername(updates.username);
          if (!userVal.isValid) {
            errors.username = userVal.error;
          } else {
            const avail = await this.checkUsernameAvailability(userVal.sanitizedValue, user.id);
            if (!avail.available) {
              errors.username = avail.error || 'This username is already taken. Please choose another.';
            } else {
              sanitizedUpdates.username = userVal.sanitizedValue;
            }
          }
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
        if (error.code === '23505' || error.message?.includes('username')) {
          return {
            profile: null,
            error: new Error('This username is already taken. Please choose another.'),
            errors: { username: 'This username is already taken. Please choose another.' },
          };
        }
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
   * with format & size validation.
   */
  async uploadAvatar(file) {
    if (!this.isConfigured() || !file) {
      return { avatar_url: null, error: new Error('Missing file or configuration') };
    }

    const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
    const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

    if (file.size && file.size > MAX_AVATAR_BYTES) {
      return {
        avatar_url: null,
        error: new Error(`Image is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 5 MB.`),
      };
    }

    if (file.type && !ALLOWED_MIME.includes(file.type.toLowerCase())) {
      return {
        avatar_url: null,
        error: new Error('Unsupported image format. Please select a JPG, PNG, or WEBP photo.'),
      };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { avatar_url: null, error: new Error('Unauthenticated') };

      const fileExt = file.name ? file.name.split('.').pop().toLowerCase() : 'jpg';
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to avatars bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        logger.warn('Storage upload notice, using object URL preview:', uploadError.message);
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
