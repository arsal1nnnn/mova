/**
 * Mova Campus — Profile, Campus Friends & Settings Screen
 *
 * Full mobile-first destination providing:
 * - Profile identity (avatar upload/remove, username, bio, friend code)
 * - Gamification stats (level, XP progress, achievements, points ledger)
 * - Campus Friends (search, friend requests, friends list, points leaderboard)
 * - Privacy settings, notifications, terms/privacy, data export, and account deletion
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  DataExportModal,
  EmptyState,
  LegalModal,
  MovaIcon,
  PageHeader,
  ScreenContainer,
  SectionHeader,
  ThemedButton,
  ThemedCard,
  ThemedText,
  ThemedTextInput,
  XpProgressBar,
} from '@/components';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { friendService } from '@/services/friend-service';
import { privacyService } from '@/services/privacy-service';
import { profileService } from '@/services/profile-service';
import { ACHIEVEMENTS_LIST, rewardService } from '@/services/reward-service';
import { Borders, Radius, Spacing } from '@/theme';

export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'friends' | 'settings'
  const [profile, setProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');

  // Gamification state
  const [userStats, setUserStats] = useState({ totalPoints: 0, totalXp: 0, ledger: [] });
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);

  // Friends state
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState({ incoming: [], outgoing: [] });
  const [leaderboard, setLeaderboard] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Settings & Privacy state
  const [settings, setSettings] = useState({
    task_reminders: true,
    class_reminders: true,
    attendance_reminders: true,
    friend_requests_notify: true,
  });
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalInitialTab, setLegalInitialTab] = useState('terms');
  const [exportModalVisible, setExportModalVisible] = useState(false);

  // Feedback banner
  const [statusFeedback, setStatusFeedback] = useState(null);

  // 1. Load Profile & Gamification data
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      setIsLoadingProfile(true);
      try {
        const [profRes, statsRes, achRes, friendRes, reqRes, leadRes, setRes] =
          await Promise.all([
            profileService.getProfile(),
            rewardService.getUserStats(),
            rewardService.getUnlockedAchievements(),
            friendService.getFriends(),
            friendService.getPendingRequests(),
            friendService.getFriendsLeaderboard(),
            privacyService.getUserSettings(),
          ]);

        if (!isCancelled) {
          if (profRes.profile) {
            setProfile(profRes.profile);
            setEditName(profRes.profile.name || '');
            setEditUsername(profRes.profile.username || '');
            setEditBio(profRes.profile.bio || '');
          }
          if (statsRes) setUserStats(statsRes);
          if (achRes.achievements) setUnlockedAchievements(achRes.achievements);
          if (friendRes.friends) setFriends(friendRes.friends);
          if (reqRes) setPendingRequests(reqRes);
          if (leadRes.leaderboard) setLeaderboard(leadRes.leaderboard);
          if (setRes.settings) setSettings(setRes.settings);
        }
      } catch {
        // Fallback gracefully
      } finally {
        if (!isCancelled) setIsLoadingProfile(false);
      }
    }

    loadData();
    return () => {
      isCancelled = true;
    };
  }, [user?.id]);

  // Handle Search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    let isCancelled = false;
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { users } = await friendService.searchUsers(searchQuery);
        if (!isCancelled) setSearchResults(users || []);
      } finally {
        if (!isCancelled) setIsSearching(false);
      }
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [searchQuery]);

  const handleSaveProfile = async () => {
    try {
      const { profile: updated, error } = await profileService.updateProfile({
        name: editName,
        username: editUsername,
        bio: editBio,
      });

      if (error) {
        setStatusFeedback(error.message || 'Failed to update profile.');
      } else if (updated) {
        setProfile(updated);
        setIsEditingProfile(false);
        setStatusFeedback('Profile updated successfully!');
        setTimeout(() => setStatusFeedback(null), 3000);
      }
    } catch {
      setStatusFeedback('Profile update failed.');
    }
  };

  const handleAvatarFileChange = async (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    setStatusFeedback('Uploading profile picture...');
    const { avatar_url, error } = await profileService.uploadAvatar(file);
    if (error) {
      setStatusFeedback('Avatar upload failed.');
    } else {
      setProfile((prev) => ({ ...prev, avatar_url }));
      setStatusFeedback('Avatar updated!');
      setTimeout(() => setStatusFeedback(null), 3000);
    }
  };

  const handleSendFriendRequest = async (targetId) => {
    const res = await friendService.sendFriendRequest(targetId);
    if (res.success) {
      setStatusFeedback('Friend request sent!');
      setSearchQuery('');
      setSearchResults([]);
      const updatedReqs = await friendService.getPendingRequests();
      setPendingRequests(updatedReqs);
      setTimeout(() => setStatusFeedback(null), 3000);
    } else {
      setStatusFeedback(res.error?.message || 'Could not send request.');
    }
  };

  const handleRespondRequest = async (requestId, accept) => {
    const res = await friendService.respondToRequest(requestId, accept);
    if (res.success) {
      setStatusFeedback(accept ? 'Friend added!' : 'Request declined.');
      const [friendRes, reqRes, leadRes] = await Promise.all([
        friendService.getFriends(),
        friendService.getPendingRequests(),
        friendService.getFriendsLeaderboard(),
      ]);
      setFriends(friendRes.friends || []);
      setPendingRequests(reqRes);
      setLeaderboard(leadRes.leaderboard || []);
      setTimeout(() => setStatusFeedback(null), 3000);
    }
  };

  const handleTogglePrivacy = async (field, currentValue) => {
    const nextVal = !currentValue;
    setProfile((prev) => ({ ...prev, [field]: nextVal }));
    await profileService.updateProfile({ [field]: nextVal });
  };

  const handleToggleSetting = async (field) => {
    const nextVal = !settings[field];
    setSettings((prev) => ({ ...prev, [field]: nextVal }));
    await privacyService.updateUserSettings({ [field]: nextVal });
  };

  const handleDeleteAccount = () => {
    const confirmMessage = 'Are you sure you want to permanently delete your account and all associated study data? This action CANNOT be undone.';
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(confirmMessage)) {
        privacyService.deleteUserAccount().then(() => {
          signOut();
        });
      }
    } else {
      Alert.alert('Delete Account', confirmMessage, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: () => {
            privacyService.deleteUserAccount().then(() => {
              signOut();
            });
          },
        },
      ]);
    }
  };

  return (
    <ScreenContainer scroll style={{ paddingBottom: insets.bottom + 80 }}>
      {/* Hidden file input for web avatar upload */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          style={{ display: 'none' }}
          onChange={handleAvatarFileChange}
        />
      )}

      <PageHeader
        title="Profile & Campus"
        subtitle={user?.email || 'Student Account'}
        action={
          <Pressable
            onPress={() => setIsEditingProfile(!isEditingProfile)}
            style={[styles.editHeaderBtn, { borderColor: theme.border }]}
          >
            <MovaIcon name="edit" size={14} color={theme.primary} />
            <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700', marginLeft: 4 }}>
              {isEditingProfile ? 'Cancel' : 'Edit'}
            </ThemedText>
          </Pressable>
        }
      />

      {statusFeedback && (
        <View style={[styles.feedbackBanner, { backgroundColor: theme.primarySubtle }]}>
          <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700' }}>
            {statusFeedback}
          </ThemedText>
        </View>
      )}

      {/* User Identity Card */}
      <ThemedCard variant="outlined" style={styles.profileHeaderCard}>
        <View style={styles.profileRow}>
          <Pressable
            onPress={() => {
              if (Platform.OS === 'web' && fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
            style={styles.avatarWrap}
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primarySubtle }]}>
                <ThemedText style={[styles.avatarInitial, { color: theme.primary }]}>
                  {(profile?.name || 'S').charAt(0).toUpperCase()}
                </ThemedText>
              </View>
            )}
            <View style={[styles.cameraBadge, { backgroundColor: theme.primary }]}>
              <MovaIcon name="camera" size={10} color="#FFFFFF" />
            </View>
          </Pressable>

          <View style={styles.identityCol}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <ThemedText type="h2" style={{ fontWeight: '700', marginRight: 6 }}>
                {profile?.name || 'Student'}
              </ThemedText>
              <View style={[styles.levelTag, { backgroundColor: theme.primarySubtle }]}>
                <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700', fontSize: 10 }}>
                  LVL {userStats.levelInfo?.level || 1}
                </ThemedText>
              </View>
            </View>

            <ThemedText type="caption" color="textSecondary">
              @{profile?.username || 'student'}
            </ThemedText>

            <View style={styles.friendCodeRow}>
              <ThemedText type="caption" color="textMuted">
                Code: {profile?.friend_code || 'MOVA-000000'}
              </ThemedText>
            </View>
          </View>
        </View>

        {profile?.bio ? (
          <ThemedText type="bodySmall" color="textSecondary" style={styles.bioText}>
            {profile.bio}
          </ThemedText>
        ) : null}

        {/* Inline Edit Form */}
        {isEditingProfile && (
          <View style={styles.editForm}>
            <ThemedText type="label" color="textPrimary" style={{ marginBottom: 4 }}>
              Display Name
            </ThemedText>
            <ThemedTextInput value={editName} onChangeText={setEditName} placeholder="Full Name" />

            <ThemedText type="label" color="textPrimary" style={{ marginTop: Spacing.sm, marginBottom: 4 }}>
              Username
            </ThemedText>
            <ThemedTextInput
              value={editUsername}
              onChangeText={setEditUsername}
              placeholder="username (lowercase, numbers)"
            />

            <ThemedText type="label" color="textPrimary" style={{ marginTop: Spacing.sm, marginBottom: 4 }}>
              Bio
            </ThemedText>
            <ThemedTextInput
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Major, semester, interests..."
              multiline
              numberOfLines={2}
            />

            <ThemedButton
              title="Save Changes"
              variant="primary"
              onPress={handleSaveProfile}
              style={{ marginTop: Spacing.md }}
            />
          </View>
        )}
      </ThemedCard>

      {/* Sub-Navigation Pill Bar */}
      <View style={[styles.subTabBar, { backgroundColor: theme.backgroundElement }]}>
        <Pressable
          onPress={() => setActiveTab('profile')}
          style={[styles.subTabBtn, activeTab === 'profile' && [styles.subTabActive, { backgroundColor: theme.surface }]]}
        >
          <MovaIcon name="trophy" size={14} color={activeTab === 'profile' ? theme.primary : theme.textSecondary} />
          <ThemedText
            type="caption"
            style={[styles.subTabLabel, { color: activeTab === 'profile' ? theme.primary : theme.textSecondary }]}
          >
            Stats & Level
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('friends')}
          style={[styles.subTabBtn, activeTab === 'friends' && [styles.subTabActive, { backgroundColor: theme.surface }]]}
        >
          <MovaIcon name="users" size={14} color={activeTab === 'friends' ? theme.primary : theme.textSecondary} />
          <ThemedText
            type="caption"
            style={[styles.subTabLabel, { color: activeTab === 'friends' ? theme.primary : theme.textSecondary }]}
          >
            Campus Friends {pendingRequests.incoming?.length > 0 ? `(${pendingRequests.incoming.length})` : ''}
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('settings')}
          style={[styles.subTabBtn, activeTab === 'settings' && [styles.subTabActive, { backgroundColor: theme.surface }]]}
        >
          <MovaIcon name="settings" size={14} color={activeTab === 'settings' ? theme.primary : theme.textSecondary} />
          <ThemedText
            type="caption"
            style={[styles.subTabLabel, { color: activeTab === 'settings' ? theme.primary : theme.textSecondary }]}
          >
            Settings
          </ThemedText>
        </Pressable>
      </View>

      {/* TAB 1: STATS & LEVEL */}
      {activeTab === 'profile' && (
        <View style={styles.tabContent}>
          <XpProgressBar
            totalPoints={userStats.totalPoints}
            totalXp={userStats.totalXp}
            style={{ marginBottom: Spacing.md }}
          />

          {/* Achievements Grid */}
          <SectionHeader
            title="Achievements & Badges"
            badge={`${unlockedAchievements.length} / ${ACHIEVEMENTS_LIST.length} UNLOCKED`}
          />

          <View style={styles.achievementsGrid}>
            {ACHIEVEMENTS_LIST.map((ach) => {
              const isUnlocked = unlockedAchievements.some((u) => u.achievement_key === ach.key);
              return (
                <ThemedCard
                  key={ach.key}
                  variant="outlined"
                  style={[
                    styles.achievementCard,
                    isUnlocked
                      ? { borderColor: theme.primary, backgroundColor: theme.surface }
                      : { borderColor: theme.border, opacity: 0.6 },
                  ]}
                >
                  <View style={[styles.achIconWrap, { backgroundColor: isUnlocked ? theme.primarySubtle : theme.disabled }]}>
                    <MovaIcon
                      name={ach.icon || 'award'}
                      size={18}
                      color={isUnlocked ? theme.primary : theme.textSecondary}
                    />
                  </View>
                  <ThemedText type="bodySmallStrong" style={{ fontWeight: '700', marginTop: 6 }} numberOfLines={1}>
                    {ach.title}
                  </ThemedText>
                  <ThemedText type="caption" color="textSecondary" numberOfLines={2} style={{ fontSize: 11, textAlign: 'center' }}>
                    {ach.description}
                  </ThemedText>
                  <View style={[styles.achPointsBadge, { backgroundColor: theme.backgroundElement }]}>
                    <ThemedText type="caption" style={{ fontWeight: '700', color: theme.primary, fontSize: 10 }}>
                      +{ach.points} XP
                    </ThemedText>
                  </View>
                </ThemedCard>
              );
            })}
          </View>

          {/* Points Ledger Audit Trail */}
          <SectionHeader title="Points History" style={{ marginTop: Spacing.lg }} />
          {userStats.ledger && userStats.ledger.length > 0 ? (
            <ThemedCard variant="outlined" style={styles.ledgerCard}>
              {userStats.ledger.slice(0, 8).map((entry, idx) => (
                <View
                  key={entry.id || idx}
                  style={[styles.ledgerRow, idx > 0 && { borderTopWidth: Borders.thin, borderColor: theme.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText type="bodySmallStrong">{entry.reason}</ThemedText>
                    <ThemedText type="caption" color="textMuted">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </ThemedText>
                  </View>
                  <ThemedText type="bodyStrong" style={{ color: theme.primary, fontWeight: '700' }}>
                    +{entry.points} pts
                  </ThemedText>
                </View>
              ))}
            </ThemedCard>
          ) : (
            <EmptyState
              iconName="sparkle"
              title="No Points Yet"
              description="Complete study tasks, maintain streaks, and stay above attendance targets to earn points."
            />
          )}
        </View>
      )}

      {/* TAB 2: CAMPUS FRIENDS & SOCIAL */}
      {activeTab === 'friends' && (
        <View style={styles.tabContent}>
          {/* Search Box */}
          <ThemedCard variant="outlined" style={styles.searchCard}>
            <ThemedText type="label" color="textPrimary" style={{ marginBottom: 4 }}>
              Find Students
            </ThemedText>
            <ThemedTextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by username, name or MOVA-XXXXXX..."
            />

            {isSearching && (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: Spacing.sm }} />
            )}

            {searchResults.length > 0 && (
              <View style={styles.resultsList}>
                {searchResults.map((peer) => (
                  <View key={peer.id} style={styles.peerRow}>
                    <View style={styles.peerAvatar}>
                      <ThemedText style={{ fontWeight: '700', color: theme.primary }}>
                        {peer.name.charAt(0)}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                      <ThemedText type="bodySmallStrong">{peer.name}</ThemedText>
                      <ThemedText type="caption" color="textSecondary">
                        @{peer.username} • LVL {peer.current_level}
                      </ThemedText>
                    </View>
                    <ThemedButton
                      title="+ Add"
                      size="sm"
                      variant="primary"
                      onPress={() => handleSendFriendRequest(peer.id)}
                    />
                  </View>
                ))}
              </View>
            )}
          </ThemedCard>

          {/* Pending Requests */}
          {pendingRequests.incoming?.length > 0 && (
            <View style={{ marginTop: Spacing.md }}>
              <SectionHeader title="Pending Friend Requests" badge={`${pendingRequests.incoming.length}`} />
              <ThemedCard variant="outlined" style={styles.requestCard}>
                {pendingRequests.incoming.map((req) => (
                  <View key={req.id} style={styles.requestRow}>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="bodySmallStrong">
                        {req.sender?.name || 'Fellow Student'}
                      </ThemedText>
                      <ThemedText type="caption" color="textSecondary">
                        @{req.sender?.username || 'student'} wants to connect
                      </ThemedText>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <ThemedButton
                        title="Accept"
                        size="sm"
                        variant="primary"
                        onPress={() => handleRespondRequest(req.id, true)}
                      />
                      <ThemedButton
                        title="Decline"
                        size="sm"
                        variant="outline"
                        onPress={() => handleRespondRequest(req.id, false)}
                      />
                    </View>
                  </View>
                ))}
              </ThemedCard>
            </View>
          )}

          {/* Friends Leaderboard */}
          <SectionHeader title="Campus Leaderboard" style={{ marginTop: Spacing.lg }} />
          {leaderboard.length > 0 ? (
            <ThemedCard variant="outlined" style={styles.leaderboardCard}>
              {leaderboard.map((item, idx) => {
                const rankColor =
                  idx === 0 ? '#E87532' : idx === 1 ? '#7C6DAF' : idx === 2 ? '#27866A' : theme.textSecondary;

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.leaderboardRow,
                      item.isSelf && { backgroundColor: theme.primarySubtle },
                      idx > 0 && { borderTopWidth: Borders.thin, borderColor: theme.border },
                    ]}
                  >
                    <View style={[styles.rankBadge, { backgroundColor: idx < 3 ? rankColor : 'transparent' }]}>
                      <ThemedText
                        style={[styles.rankText, { color: idx < 3 ? '#FFFFFF' : theme.textSecondary }]}
                      >
                        #{item.rank}
                      </ThemedText>
                    </View>

                    <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                      <ThemedText type="bodySmallStrong">
                        {item.name} {item.isSelf ? '(You)' : ''}
                      </ThemedText>
                      <ThemedText type="caption" color="textSecondary">
                        @{item.username} • LVL {item.current_level}
                      </ThemedText>
                    </View>

                    <View style={styles.pointsCol}>
                      <ThemedText type="bodyStrong" style={{ fontWeight: '700', color: theme.primary }}>
                        {item.total_points ?? '—'}
                      </ThemedText>
                      <ThemedText type="caption" color="textMuted" style={{ fontSize: 10 }}>
                        points
                      </ThemedText>
                    </View>
                  </View>
                );
              })}
            </ThemedCard>
          ) : (
            <EmptyState
              iconName="users"
              title="No Friends Added"
              description="Share your friend code or search students by username to compete on the points leaderboard."
            />
          )}

          {/* Friends List */}
          <SectionHeader title={`My Friends (${friends.length})`} style={{ marginTop: Spacing.lg }} />
          {friends.length > 0 ? (
            <ThemedCard variant="outlined" style={styles.friendsCard}>
              {friends.map((friend, idx) => (
                <View
                  key={friend.id}
                  style={[styles.friendRow, idx > 0 && { borderTopWidth: Borders.thin, borderColor: theme.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText type="bodySmallStrong">{friend.name}</ThemedText>
                    <ThemedText type="caption" color="textSecondary">
                      @{friend.username} • LVL {friend.current_level}
                    </ThemedText>
                  </View>
                  <ThemedButton
                    title="Remove"
                    size="sm"
                    variant="outline"
                    onPress={async () => {
                      await friendService.removeFriend(friend.id);
                      setFriends((prev) => prev.filter((f) => f.id !== friend.id));
                    }}
                  />
                </View>
              ))}
            </ThemedCard>
          ) : null}
        </View>
      )}

      {/* TAB 3: SETTINGS, PRIVACY & LEGAL */}
      {activeTab === 'settings' && (
        <View style={styles.tabContent}>
          {/* Privacy Controls */}
          <SectionHeader title="Profile Privacy" />
          <ThemedCard variant="outlined" style={styles.settingsCard}>
            <Pressable
              onPress={() => handleTogglePrivacy('is_discoverable', profile?.is_discoverable)}
              style={styles.settingToggleRow}
            >
              <View style={{ flex: 1 }}>
                <ThemedText type="bodySmallStrong">Profile Discoverability</ThemedText>
                <ThemedText type="caption" color="textSecondary">
                  Allow other students to find you via username search
                </ThemedText>
              </View>
              <View style={[styles.togglePill, { backgroundColor: profile?.is_discoverable ? theme.primary : theme.disabled }]}>
                <ThemedText type="caption" style={{ color: profile?.is_discoverable ? '#FFF' : theme.textSecondary, fontWeight: '700', fontSize: 10 }}>
                  {profile?.is_discoverable ? 'ON' : 'OFF'}
                </ThemedText>
              </View>
            </Pressable>

            <Pressable
              onPress={() => handleTogglePrivacy('is_streak_public', profile?.is_streak_public)}
              style={[styles.settingToggleRow, { borderTopWidth: Borders.thin, borderColor: theme.border }]}
            >
              <View style={{ flex: 1 }}>
                <ThemedText type="bodySmallStrong">Show Consistency Streak</ThemedText>
                <ThemedText type="caption" color="textSecondary">
                  Allow campus friends to see your daily streak count
                </ThemedText>
              </View>
              <View style={[styles.togglePill, { backgroundColor: profile?.is_streak_public ? theme.primary : theme.disabled }]}>
                <ThemedText type="caption" style={{ color: profile?.is_streak_public ? '#FFF' : theme.textSecondary, fontWeight: '700', fontSize: 10 }}>
                  {profile?.is_streak_public ? 'ON' : 'OFF'}
                </ThemedText>
              </View>
            </Pressable>

            <Pressable
              onPress={() => handleTogglePrivacy('is_points_public', profile?.is_points_public)}
              style={[styles.settingToggleRow, { borderTopWidth: Borders.thin, borderColor: theme.border }]}
            >
              <View style={{ flex: 1 }}>
                <ThemedText type="bodySmallStrong">Show Points on Leaderboard</ThemedText>
                <ThemedText type="caption" color="textSecondary">
                  Display your score on the campus leaderboard
                </ThemedText>
              </View>
              <View style={[styles.togglePill, { backgroundColor: profile?.is_points_public ? theme.primary : theme.disabled }]}>
                <ThemedText type="caption" style={{ color: profile?.is_points_public ? '#FFF' : theme.textSecondary, fontWeight: '700', fontSize: 10 }}>
                  {profile?.is_points_public ? 'ON' : 'OFF'}
                </ThemedText>
              </View>
            </Pressable>
          </ThemedCard>

          {/* Notifications */}
          <SectionHeader title="Notification Preferences" style={{ marginTop: Spacing.md }} />
          <ThemedCard variant="outlined" style={styles.settingsCard}>
            <Pressable onPress={() => handleToggleSetting('task_reminders')} style={styles.settingToggleRow}>
              <View style={{ flex: 1 }}>
                <ThemedText type="bodySmallStrong">Study Task Deadlines</ThemedText>
                <ThemedText type="caption" color="textSecondary">Reminders before priority tasks are due</ThemedText>
              </View>
              <View style={[styles.togglePill, { backgroundColor: settings.task_reminders ? theme.primary : theme.disabled }]}>
                <ThemedText type="caption" style={{ color: settings.task_reminders ? '#FFF' : theme.textSecondary, fontWeight: '700', fontSize: 10 }}>
                  {settings.task_reminders ? 'ON' : 'OFF'}
                </ThemedText>
              </View>
            </Pressable>

            <Pressable onPress={() => handleToggleSetting('class_reminders')} style={[styles.settingToggleRow, { borderTopWidth: Borders.thin, borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <ThemedText type="bodySmallStrong">Upcoming Class Alerts</ThemedText>
                <ThemedText type="caption" color="textSecondary">15-minute notice before scheduled lectures</ThemedText>
              </View>
              <View style={[styles.togglePill, { backgroundColor: settings.class_reminders ? theme.primary : theme.disabled }]}>
                <ThemedText type="caption" style={{ color: settings.class_reminders ? '#FFF' : theme.textSecondary, fontWeight: '700', fontSize: 10 }}>
                  {settings.class_reminders ? 'ON' : 'OFF'}
                </ThemedText>
              </View>
            </Pressable>

            <Pressable onPress={() => handleToggleSetting('attendance_reminders')} style={[styles.settingToggleRow, { borderTopWidth: Borders.thin, borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <ThemedText type="bodySmallStrong">Attendance Safe Bunk Warning</ThemedText>
                <ThemedText type="caption" color="textSecondary">Alerts when attendance approaches the 75% threshold</ThemedText>
              </View>
              <View style={[styles.togglePill, { backgroundColor: settings.attendance_reminders ? theme.primary : theme.disabled }]}>
                <ThemedText type="caption" style={{ color: settings.attendance_reminders ? '#FFF' : theme.textSecondary, fontWeight: '700', fontSize: 10 }}>
                  {settings.attendance_reminders ? 'ON' : 'OFF'}
                </ThemedText>
              </View>
            </Pressable>
          </ThemedCard>

          {/* Legal & Data Rights */}
          <SectionHeader title="Legal & Data Controls" style={{ marginTop: Spacing.md }} />
          <ThemedCard variant="outlined" style={styles.settingsCard}>
            <Pressable
              onPress={() => {
                setLegalInitialTab('terms');
                setLegalModalVisible(true);
              }}
              style={styles.settingActionRow}
            >
              <ThemedText type="bodySmallStrong">Terms of Service</ThemedText>
              <MovaIcon name="chevron-right" size={16} color={theme.textSecondary} />
            </Pressable>

            <Pressable
              onPress={() => {
                setLegalInitialTab('privacy');
                setLegalModalVisible(true);
              }}
              style={[styles.settingActionRow, { borderTopWidth: Borders.thin, borderColor: theme.border }]}
            >
              <ThemedText type="bodySmallStrong">Privacy Policy</ThemedText>
              <MovaIcon name="chevron-right" size={16} color={theme.textSecondary} />
            </Pressable>

            <Pressable
              onPress={() => setExportModalVisible(true)}
              style={[styles.settingActionRow, { borderTopWidth: Borders.thin, borderColor: theme.border }]}
            >
              <View>
                <ThemedText type="bodySmallStrong">Export Personal Data (.json)</ThemedText>
                <ThemedText type="caption" color="textSecondary">
                  Download all personal study data and schedules
                </ThemedText>
              </View>
              <MovaIcon name="download" size={16} color={theme.primary} />
            </Pressable>
          </ThemedCard>

          {/* Account Actions */}
          <View style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
            <ThemedButton title="Sign Out" variant="outline" onPress={signOut} />
            <ThemedButton
              title="Delete Account & Purge Data"
              variant="outline"
              onPress={handleDeleteAccount}
              style={{ borderColor: theme.error }}
            />
          </View>
        </View>
      )}

      {/* Modals */}
      <LegalModal
        visible={legalModalVisible}
        onClose={() => setLegalModalVisible(false)}
        initialTab={legalInitialTab}
      />
      <DataExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  editHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    borderWidth: Borders.thin,
  },
  feedbackBanner: {
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  profileHeaderCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.full,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 26,
    fontWeight: '800',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityCol: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  levelTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  friendCodeRow: {
    marginTop: 2,
  },
  bioText: {
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  editForm: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: Borders.thin,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  subTabBar: {
    flexDirection: 'row',
    borderRadius: Radius.sm,
    padding: 3,
    marginBottom: Spacing.md,
  },
  subTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: Radius.xs,
  },
  subTabActive: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  subTabLabel: {
    fontWeight: '700',
    marginLeft: 5,
    fontSize: 11,
  },
  tabContent: {
    paddingBottom: Spacing.lg,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  achievementCard: {
    width: '48%',
    padding: Spacing.sm,
    alignItems: 'center',
  },
  achIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achPointsBadge: {
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  ledgerCard: {
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  searchCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  resultsList: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  peerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  peerAvatar: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: '#FDF1EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestCard: {
    padding: Spacing.sm,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  leaderboardCard: {
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: Radius.sm,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 11,
    fontWeight: '800',
  },
  pointsCol: {
    alignItems: 'flex-end',
  },
  friendsCard: {
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  settingsCard: {
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  settingToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  settingActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  togglePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
});
