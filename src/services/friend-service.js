/**
 * Mova Campus — Friends & Campus Social Service
 *
 * Implements privacy-first student social interactions:
 * - Unique friend code generation & lookup.
 * - Search discoverable campus peers (excludes blocked users and undiscoverable profiles).
 * - Two-way friend requests (send, accept, reject, cancel).
 * - Safety controls: block user and report abuse.
 * - Privacy-restricted public profile view: only displays level, public points,
 *   public streak, and achievements. Never leaks email, date of birth, tasks, or attendance.
 * - Friends points leaderboard.
 */

import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import { logger } from '../utils/logger.js';

export const friendService = {
  isConfigured() {
    return isSupabaseConfigured && supabase !== null;
  },

  /**
   * Searches for discoverable users by username, display name, or friend code.
   */
  async searchUsers(query = '') {
    if (!this.isConfigured() || !query || query.trim().length < 2) {
      return { users: [], error: null };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { users: [], error: null };

      const cleanQuery = query.trim().toLowerCase();

      // Get list of blocked users to exclude
      const { data: blockedList } = await supabase
        .from('user_blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id);

      const blockedIds = new Set((blockedList || []).map((b) => b.blocked_id));
      blockedIds.add(user.id); // exclude self

      // Query profiles
      let req = supabase
        .from('profiles')
        .select('id, name, username, avatar_url, friend_code, total_points, current_level, is_discoverable, is_points_public, is_streak_public')
        .eq('is_discoverable', true)
        .limit(20);

      if (cleanQuery.startsWith('mova-')) {
        req = req.eq('friend_code', cleanQuery.toUpperCase());
      } else {
        req = req.or(`username.ilike.%${cleanQuery}%,name.ilike.%${cleanQuery}%`);
      }

      const { data, error } = await req;
      if (error) {
        logger.warn('Search users notice:', error.message);
        return { users: [], error: null };
      }

      // Filter blocked
      const filtered = (data || [])
        .filter((p) => !blockedIds.has(p.id))
        .map((p) => ({
          id: p.id,
          name: p.name || 'Student',
          username: p.username || 'student',
          avatar_url: p.avatar_url,
          friend_code: p.friend_code,
          current_level: p.current_level || 1,
          total_points: p.is_points_public !== false ? (p.total_points || 0) : null,
        }));

      return { users: filtered, error: null };
    } catch (err) {
      return { users: [], error: err };
    }
  },

  /**
   * Fetches incoming and outgoing pending friend requests.
   */
  async getPendingRequests() {
    if (!this.isConfigured()) return { incoming: [], outgoing: [], error: null };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { incoming: [], outgoing: [], error: null };

      const { data: requests, error } = await supabase
        .from('friend_requests')
        .select(`
          id,
          sender_id,
          receiver_id,
          status,
          created_at,
          sender:profiles!friend_requests_sender_id_fkey(id, name, username, avatar_url, friend_code),
          receiver:profiles!friend_requests_receiver_id_fkey(id, name, username, avatar_url, friend_code)
        `)
        .eq('status', 'pending')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (error) {
        // Fallback simple query if joins fail
        const { data: simpleRequests } = await supabase
          .from('friend_requests')
          .select('*')
          .eq('status', 'pending')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

        const incoming = (simpleRequests || []).filter((r) => r.receiver_id === user.id);
        const outgoing = (simpleRequests || []).filter((r) => r.sender_id === user.id);
        return { incoming, outgoing, error: null };
      }

      const incoming = (requests || []).filter((r) => r.receiver_id === user.id);
      const outgoing = (requests || []).filter((r) => r.sender_id === user.id);

      return { incoming, outgoing, error: null };
    } catch (err) {
      return { incoming: [], outgoing: [], error: err };
    }
  },

  /**
   * Sends a friend request to receiverId.
   */
  async sendFriendRequest(receiverId) {
    if (!this.isConfigured() || !receiverId) return { success: false, error: new Error('Missing user.') };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: new Error('Unauthenticated.') };
      if (user.id === receiverId) return { success: false, error: new Error('Cannot add yourself.') };

      const { data, error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: new Error('Friend request already pending.') };
        }
        return { success: false, error };
      }

      return { success: true, request: data };
    } catch (err) {
      return { success: false, error: err };
    }
  },

  /**
   * Responds to an incoming friend request (accept or reject).
   */
  async respondToRequest(requestId, accept = true) {
    if (!this.isConfigured() || !requestId) return { success: false };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: new Error('Unauthenticated') };

      const newStatus = accept ? 'accepted' : 'rejected';

      const { data: reqData, error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: newStatus })
        .eq('id', requestId)
        .eq('receiver_id', user.id)
        .select()
        .single();

      if (updateError || !reqData) {
        return { success: false, error: updateError || new Error('Request not found.') };
      }

      if (accept) {
        // Create 2-way friendship
        await supabase.from('friendships').insert([
          { user_id: user.id, friend_id: reqData.sender_id },
          { user_id: reqData.sender_id, friend_id: user.id },
        ]);
      }

      return { success: true, status: newStatus };
    } catch (err) {
      return { success: false, error: err };
    }
  },

  /**
   * Cancels a pending friend request sent by the user.
   */
  async cancelRequest(requestId) {
    if (!this.isConfigured() || !requestId) return { success: false };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false };

      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId)
        .eq('sender_id', user.id);

      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  },

  /**
   * Fetches the user's friends list with public profile statistics.
   */
  async getFriends() {
    if (!this.isConfigured()) return { friends: [], error: null };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { friends: [], error: null };

      // Query friendships
      const { data: relations, error: relError } = await supabase
        .from('friendships')
        .select('friend_id, created_at')
        .eq('user_id', user.id);

      if (relError) {
        logger.warn('Friendships query notice:', relError.message);
        return { friends: [], error: null };
      }

      if (!relations || relations.length === 0) {
        return { friends: [], error: null };
      }

      const friendIds = relations.map((r) => r.friend_id);

      // Query friend profiles (only public fields)
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, name, username, avatar_url, friend_code, total_points, current_level, is_points_public, is_streak_public')
        .in('id', friendIds);

      if (profError) return { friends: [], error: profError };

      const friends = (profiles || []).map((p) => ({
        id: p.id,
        name: p.name || 'Friend',
        username: p.username || 'student',
        avatar_url: p.avatar_url,
        friend_code: p.friend_code,
        current_level: p.current_level || 1,
        total_points: p.is_points_public !== false ? (p.total_points || 0) : null,
      }));

      return { friends, error: null };
    } catch (err) {
      return { friends: [], error: err };
    }
  },

  /**
   * Removes a friend relationship.
   */
  async removeFriend(friendId) {
    if (!this.isConfigured() || !friendId) return { success: false };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false };

      await supabase.from('friendships').delete().or(
        `and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`
      );

      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  },

  /**
   * Blocks a user.
   */
  async blockUser(targetUserId) {
    if (!this.isConfigured() || !targetUserId) return { success: false };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false };

      // 1. Insert block
      await supabase.from('user_blocks').insert({
        blocker_id: user.id,
        blocked_id: targetUserId,
      });

      // 2. Remove any existing friendship or pending requests
      await this.removeFriend(targetUserId);
      await supabase.from('friend_requests').delete().or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${user.id})`
      );

      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  },

  /**
   * Unblocks a previously blocked user.
   */
  async unblockUser(targetUserId) {
    if (!this.isConfigured() || !targetUserId) return { success: false };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false };

      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', targetUserId);

      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  },

  /**
   * Retrieves the list of users blocked by the authenticated user.
   */
  async getBlockedUsers() {
    if (!this.isConfigured()) return { blockedUsers: [], error: null };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { blockedUsers: [], error: null };

      const { data, error } = await supabase
        .from('user_blocks')
        .select(`
          id,
          blocked_id,
          created_at,
          blocked:profiles!user_blocks_blocked_id_fkey(id, name, username, avatar_url)
        `)
        .eq('blocker_id', user.id);

      if (error) {
        // Fallback without relation join if foreign key naming differs
        const { data: simpleBlocks, error: simpleErr } = await supabase
          .from('user_blocks')
          .select('id, blocked_id, created_at')
          .eq('blocker_id', user.id);

        if (simpleErr) return { blockedUsers: [], error: simpleErr };

        const blockedIds = (simpleBlocks || []).map((b) => b.blocked_id);
        if (blockedIds.length === 0) return { blockedUsers: [], error: null };

        const { data: profs } = await supabase
          .from('profiles')
          .select('id, name, username, avatar_url')
          .in('id', blockedIds);

        const profMap = new Map((profs || []).map((p) => [p.id, p]));
        const merged = (simpleBlocks || []).map((b) => ({
          ...b,
          blocked: profMap.get(b.blocked_id) || { id: b.blocked_id, name: 'Blocked Student', username: 'student' },
        }));

        return { blockedUsers: merged, error: null };
      }

      return { blockedUsers: data || [], error: null };
    } catch (err) {
      return { blockedUsers: [], error: err };
    }
  },

  /**
   * Reports a user for abusive behavior.
   */
  async reportUser(targetUserId, reason = 'abusive_behavior', details = '') {
    if (!this.isConfigured() || !targetUserId) return { success: false };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false };

      const { error } = await supabase.from('user_reports').insert({
        reporter_id: user.id,
        reported_id: targetUserId,
        reason: reason.trim(),
        details: details.trim().slice(0, 500),
      });

      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  },

  /**
   * Fetches leaderboard ranking friends + self by total points.
   */
  async getFriendsLeaderboard() {
    if (!this.isConfigured()) return { leaderboard: [], error: null };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { leaderboard: [], error: null };

      const { friends } = await this.getFriends();

      // Fetch self profile
      const { data: selfProfile } = await supabase
        .from('profiles')
        .select('id, name, username, avatar_url, friend_code, total_points, current_level, is_points_public')
        .eq('id', user.id)
        .single();

      const allParticipants = [...(friends || [])];
      if (selfProfile) {
        allParticipants.push({
          id: selfProfile.id,
          name: selfProfile.name || 'You',
          username: selfProfile.username || 'you',
          avatar_url: selfProfile.avatar_url,
          friend_code: selfProfile.friend_code,
          current_level: selfProfile.current_level || 1,
          total_points: selfProfile.total_points || 0,
          isSelf: true,
        });
      }

      // Sort by points descending
      allParticipants.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));

      const ranked = allParticipants.map((p, idx) => ({
        ...p,
        rank: idx + 1,
      }));

      return { leaderboard: ranked, error: null };
    } catch (err) {
      return { leaderboard: [], error: err };
    }
  },
};
