/**
 * Mova Campus Sign-in Screen
 *
 * Distinctive, premium authentication screen for Mova Campus.
 * Preserves Google and Apple Supabase OAuth flows while presenting
 * an editorial, calm student productivity brand.
 *
 * Layout: Centered column with responsive breathing room, ambient
 * warmth, feature highlights, and clear student privacy commitments.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppleLogo, GoogleLogo } from '@/components/brand-icons';
import { MovaIcon } from '@/components/mova-icon';
import { ThemedButton } from '@/components/themed-button';
import { ThemedCard } from '@/components/themed-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { Borders, Radius, Spacing } from '@/theme';

export function SignInScreen() {
  const theme = useTheme();
  const { isConfigured, error, signInWithGoogle, signInWithApple, clearError } = useAuth();
  const [activeProvider, setActiveProvider] = useState(null);
  const isMountedRef = useRef(true);

  const isBusy = activeProvider !== null;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleGoogleSignIn = async () => {
    if (isBusy) return;
    clearError();
    setActiveProvider('google');
    try {
      await signInWithGoogle();
    } finally {
      if (isMountedRef.current) {
        setActiveProvider(null);
      }
    }
  };

  const handleAppleSignIn = async () => {
    if (isBusy) return;
    clearError();
    setActiveProvider('apple');
    try {
      await signInWithApple();
    } finally {
      if (isMountedRef.current) {
        setActiveProvider(null);
      }
    }
  };

  const FEATURES = [
    { icon: 'timetable', label: 'Recurring Weekly Timetable' },
    { icon: 'attendance', label: 'Safe Bunk Attendance Tracker' },
    { icon: 'tasks', label: 'Daily Focus & Deadlines' },
  ];

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.content}>
            {/* Brand Header */}
            <View style={styles.brandContainer}>
              <View
                accessible={false}
                style={[
                  styles.brandMark,
                  { backgroundColor: theme.primary, borderColor: theme.primaryPressed },
                ]}>
                <ThemedText style={[styles.brandMarkLetter, { color: theme.primaryText }]}>
                  M
                </ThemedText>
              </View>
              <View style={styles.brandTitleCol}>
                <ThemedText type="h2" style={styles.brandTitle}>
                  Mova Campus
                </ThemedText>
                <ThemedText type="caption" themeColor="textMuted">
                  Student Productivity Workspace
                </ThemedText>
              </View>
            </View>

            {/* Editorial Introduction */}
            <View style={styles.heroTextContainer}>
              <ThemedText type="display" style={styles.headline}>
                Your campus day, clearly organized.
              </ThemedText>
              <ThemedText type="body" themeColor="textSecondary" style={styles.supporting}>
                Never miss a lecture or drop below attendance targets. All your classes,
                assignments, and bunk quotas in one calm workspace.
              </ThemedText>
            </View>

            {/* Feature Pills */}
            <View style={styles.featurePillsWrap}>
              {FEATURES.map((f) => (
                <View
                  key={f.label}
                  style={[
                    styles.featurePill,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}>
                  <MovaIcon name={f.icon} size={14} color={theme.primary} />
                  <ThemedText type="caption" style={{ color: theme.textSecondary, fontWeight: '600' }}>
                    {f.label}
                  </ThemedText>
                </View>
              ))}
            </View>

            {/* Sign-in Panel */}
            <ThemedCard variant="elevated" radius="xl" style={styles.authCard}>
              <View style={styles.authHeading}>
                <ThemedText type="h3">Get Started</ThemedText>
                <ThemedText type="bodySmall" themeColor="textSecondary">
                  Sign in with your Google or Apple account to continue.
                </ThemedText>
              </View>

              {!isConfigured && (
                <View
                  style={[
                    styles.notice,
                    {
                      backgroundColor: theme.warningBackground,
                      borderColor: theme.warning,
                    },
                  ]}>
                  <ThemedText type="bodySmallStrong" style={{ color: theme.warning }}>
                    Configuration notice
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    Supabase credentials are not detected. Set EXPO_PUBLIC_SUPABASE_URL and
                    EXPO_PUBLIC_SUPABASE_ANON_KEY to enable cloud sync.
                  </ThemedText>
                </View>
              )}

              {error && (
                <View
                  style={[
                    styles.notice,
                    {
                      backgroundColor: theme.errorBackground,
                      borderColor: theme.error,
                    },
                  ]}>
                  <ThemedText type="bodySmallStrong" style={{ color: theme.error }}>
                    Authentication error
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.error }}>
                    {error}
                  </ThemedText>
                </View>
              )}

              <View style={styles.buttonStack}>
                <ThemedButton
                  title="Continue with Google"
                  accessibilityLabel="Continue with Google"
                  accessibilityHint="Signs in using your Google account"
                  variant="surface"
                  size="lg"
                  disabled={isBusy}
                  loading={activeProvider === 'google'}
                  onPress={handleGoogleSignIn}
                  leftIcon={<GoogleLogo size={20} />}
                  style={styles.authButton}
                />

                <ThemedButton
                  title="Continue with Apple"
                  accessibilityLabel="Continue with Apple"
                  accessibilityHint="Signs in using your Apple ID"
                  variant="surface"
                  size="lg"
                  disabled={isBusy}
                  loading={activeProvider === 'apple'}
                  onPress={handleAppleSignIn}
                  leftIcon={<AppleLogo size={20} color={theme.text} />}
                  style={styles.authButton}
                />
              </View>

              <View style={styles.privacyRow}>
                <MovaIcon name="check" size={12} color={theme.success} />
                <ThemedText type="caption" themeColor="textMuted" style={styles.privacyText}>
                  Your schedule and records stay private to your account.
                </ThemedText>
              </View>
            </ThemedCard>

            {/* Footer */}
            <ThemedText type="caption" themeColor="textMuted" style={styles.terms}>
              Mova Campus · Embarko Student Challenge edition
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xxl,
  },
  content: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    gap: Spacing.lg,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkLetter: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
  },
  brandTitleCol: {
    gap: 1,
  },
  brandTitle: {
    letterSpacing: -0.5,
    fontSize: 20,
    lineHeight: 24,
  },
  heroTextContainer: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  headline: {
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  supporting: {
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 22,
  },
  featurePillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: Borders.thin,
    gap: 6,
  },
  authCard: {
    width: '100%',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  authHeading: {
    gap: Spacing.xxxs,
  },
  notice: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: Borders.thin,
    gap: 2,
  },
  buttonStack: {
    gap: Spacing.sm,
  },
  authButton: {
    width: '100%',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.xxs,
  },
  privacyText: {
    fontSize: 11,
    textAlign: 'center',
  },
  terms: {
    textAlign: 'center',
    alignSelf: 'center',
    fontSize: 11,
  },
});
