/**
 * Mova Profile & Settings Modal Component
 *
 * Allows students to:
 * - View & edit their display name and date of birth
 * - View their calculated college age
 * - Switch Theme (System / Light / Dark)
 * - View account email and session info
 * - Sign out securely
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MovaIcon } from '@/components/mova-icon';
import { ThemedButton } from '@/components/themed-button';
import { ThemedCard } from '@/components/themed-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { useAuth } from '@/hooks/use-auth';
import { useTheme, useThemeMode } from '@/theme';
import { profileService } from '@/services/profile-service';
import { Borders, Radius, Spacing } from '@/theme';

function ProfileModalContent({ onClose, onProfileUpdated }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { themeMode, setThemeMode } = useThemeMode();

  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [age, setAge] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const { profile } = await profileService.getProfile();
        if (isMounted) {
          if (profile) {
            setName(profile.name || '');
            setDob(profile.date_of_birth || '');
            setAge(profile.age || null);
          } else {
            const fallbackName =
              user?.user_metadata?.full_name ||
              user?.user_metadata?.name ||
              (user?.email ? user.email.split('@')[0] : '');
            setName(fallbackName);
          }
        }
      } catch {
        // Fallback silently
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleSave = async () => {
    setError(null);
    setMessage(null);
    setIsSaving(true);

    try {
      // Check if profile exists first
      const { profile: existing } = await profileService.getProfile();
      let res;
      if (existing) {
        res = await profileService.updateProfile({
          name: name.trim(),
          date_of_birth: dob.trim() ? dob.trim() : undefined,
        });
      } else {
        res = await profileService.createProfile({
          name: name.trim() || 'Student',
          date_of_birth: dob.trim() || '2004-01-01',
        });
      }

      if (res.error) {
        setError(res.error.message || 'Could not save profile.');
      } else {
        setMessage('Profile updated successfully!');
        if (res.profile?.age) setAge(res.profile.age);
        onProfileUpdated?.(res.profile);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const THEME_OPTIONS = [
    { key: 'system', label: 'System', icon: 'settings' },
    { key: 'light', label: 'Light', icon: 'sun' },
    { key: 'dark', label: 'Dark', icon: 'moon' },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[
        styles.backdrop,
        { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.72)' : 'rgba(31,27,22,0.44)' },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close profile sheet"
        style={styles.dismissOverlay}
        onPress={onClose}
      />

      <ThemedCard
        variant="elevated"
        style={[
          styles.modalCard,
          { paddingBottom: Math.max(Spacing.lg, insets.bottom + Spacing.md) },
        ]}>
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: theme.borderStrong }]} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleCol}>
              <ThemedText type="h3">Student Profile & Settings</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Personal preferences and campus account
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}>
              <MovaIcon name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : (
            <>
              {/* Avatar + Account Summary Card */}
              <View
                style={[
                  styles.profileHero,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}>
                <View
                  style={[
                    styles.avatarBadge,
                    { backgroundColor: theme.primarySubtle, borderColor: theme.borderFocus },
                  ]}>
                  <ThemedText style={[styles.avatarGlyph, { color: theme.primary }]}>
                    {name ? name.charAt(0).toUpperCase() : 'M'}
                  </ThemedText>
                </View>
                <View style={styles.profileMeta}>
                  <ThemedText type="bodyStrong" numberOfLines={1}>
                    {name || 'Mova Student'}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                    {user?.email || 'Signed in via OAuth'}
                  </ThemedText>
                  {age !== null && (
                    <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '600' }}>
                      Age: {age} years
                    </ThemedText>
                  )}
                </View>
              </View>

              {/* Status messages */}
              {error && (
                <View
                  style={[
                    styles.messageBanner,
                    { backgroundColor: theme.errorBackground, borderColor: theme.error },
                  ]}>
                  <ThemedText type="caption" style={{ color: theme.error }}>
                    {error}
                  </ThemedText>
                </View>
              )}
              {message && (
                <View
                  style={[
                    styles.messageBanner,
                    { backgroundColor: theme.successBackground, borderColor: theme.success },
                  ]}>
                  <ThemedText type="caption" style={{ color: theme.success }}>
                    {message}
                  </ThemedText>
                </View>
              )}

              {/* Edit Details */}
              <View style={styles.section}>
                <ThemedText type="label" themeColor="textSecondary" style={styles.sectionLabel}>
                  Profile Details
                </ThemedText>
                <ThemedTextInput
                  label="Display Name"
                  placeholder="e.g. Alex Morgan"
                  value={name}
                  onChangeText={setName}
                  maxLength={100}
                />
                <ThemedTextInput
                  label="Date of Birth (YYYY-MM-DD)"
                  placeholder="e.g. 2004-05-14"
                  value={dob}
                  onChangeText={setDob}
                  maxLength={10}
                />
                <ThemedButton
                  title="Save Profile"
                  variant="primary"
                  size="sm"
                  loading={isSaving}
                  onPress={handleSave}
                  style={styles.saveBtn}
                />
              </View>

              {/* Account / Sign out */}
              <View style={[styles.section, { borderTopWidth: Borders.thin, borderTopColor: theme.divider, paddingTop: Spacing.md }]}>
                <ThemedButton
                  title="Sign Out"
                  variant="outline"
                  onPress={signOut}
                  textStyle={{ color: theme.error }}
                  leftIcon={<MovaIcon name="log-out" size={16} color={theme.error} />}
                  style={{ width: '100%' }}
                />
              </View>
            </>
          )}
        </ScrollView>
      </ThemedCard>
    </KeyboardAvoidingView>
  );
}

export function ProfileModal({ visible, onClose, onProfileUpdated }) {
  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <ProfileModalContent onClose={onClose} onProfileUpdated={onProfileUpdated} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismissOverlay: {
    flex: 1,
  },
  modalCard: {
    maxHeight: '92%',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  handleWrap: {
    alignItems: 'center',
    paddingBottom: Spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: Radius.full,
  },
  scrollContent: {
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitleCol: {
    flex: 1,
    gap: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  profileHero: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: Borders.thin,
    gap: Spacing.sm,
  },
  avatarBadge: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlyph: {
    fontSize: 22,
    fontWeight: '800',
  },
  profileMeta: {
    flex: 1,
    gap: 2,
  },
  messageBanner: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: Borders.thin,
  },
  section: {
    gap: Spacing.xs,
  },
  sectionLabel: {
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  saveBtn: {
    marginTop: Spacing.xxs,
    alignSelf: 'flex-start',
  },
  themeSelector: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: Radius.md,
    borderWidth: Borders.thin,
    gap: 2,
  },
  themeOpt: {
    flex: 1,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.sm,
  },
});
