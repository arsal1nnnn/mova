/**
 * Mova Campus — Focus Mode Screen
 *
 * Dedicated study destination featuring:
 * - Pomodoro & custom interval presets (25m, 45m, 60m, custom)
 * - Accurate background-resilient countdown timer via Date.now() elapsed calculation
 * - Session tracking, streak counter, and idempotent XP gamification rewards
 * - Transparent disclosure regarding OS-level app blocking constraints
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import {
  MovaIcon,
  PageHeader,
  ScreenContainer,
  SectionHeader,
  ThemedButton,
  ThemedCard,
  ThemedText,
  ThemedTextInput,
} from '@/components';
import { useTheme } from '@/hooks/use-theme';
import { focusService } from '@/services/focus-service';
import { Borders, Radius, Spacing } from '@/theme';

const PRESETS = [
  { id: 'pomodoro', name: 'Pomodoro', minutes: 25, xp: 25, icon: 'target' },
  { id: 'deep_work', name: 'Deep Work', minutes: 45, xp: 45, icon: 'zap' },
  { id: 'marathon', name: 'Marathon', minutes: 60, xp: 60, icon: 'flame' },
  { id: 'custom', name: 'Custom', minutes: 30, xp: 30, icon: 'clock' },
];

export default function FocusScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [selectedPreset, setSelectedPreset] = useState('pomodoro');
  const [customMinutesInput, setCustomMinutesInput] = useState('30');
  const [targetDurationMinutes, setTargetDurationMinutes] = useState(25);

  // Timer states: 'idle' | 'running' | 'paused' | 'completed'
  const [timerState, setTimerState] = useState('idle');
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionStartedIso, setSessionStartedIso] = useState(null);
  const [xpEarned, setXpEarned] = useState(0);

  // Stats
  const [focusStats, setFocusStats] = useState({
    todayMinutes: 0,
    todaySessions: 0,
    totalMinutes: 0,
    streakDays: 0,
    recentSessions: [],
  });

  const intervalRef = useRef(null);
  const targetSecondsRef = useRef(25 * 60);
  const startTimeRef = useRef(null);

  // Load stats on mount
  useEffect(() => {
    let isCancelled = false;
    async function loadStats() {
      const stats = await focusService.getFocusStats();
      if (!isCancelled) {
        setFocusStats(stats);
      }
    }
    loadStats();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Update target seconds when preset or custom input changes (only if idle)
  useEffect(() => {
    if (timerState !== 'idle') return;

    if (selectedPreset === 'custom') {
      const val = parseInt(customMinutesInput, 10);
      const mins = Number.isFinite(val) && val > 0 ? Math.min(val, 240) : 30;
      setTargetDurationMinutes(mins);
      setRemainingSeconds(mins * 60);
      targetSecondsRef.current = mins * 60;
    } else {
      const p = PRESETS.find((x) => x.id === selectedPreset);
      const mins = p ? p.minutes : 25;
      setTargetDurationMinutes(mins);
      setRemainingSeconds(mins * 60);
      targetSecondsRef.current = mins * 60;
    }
  }, [selectedPreset, customMinutesInput, timerState]);

  // Handle timer tick with elapsed time calculation for accurate backgrounding
  useEffect(() => {
    if (timerState !== 'running') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      if (!startTimeRef.current) return;
      const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, targetSecondsRef.current - elapsedSeconds);

      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(intervalRef.current);
        handleSessionComplete();
      }
    }, 500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState]);

  // AppState listener for background / foreground accuracy
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && timerState === 'running' && startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const rem = Math.max(0, targetSecondsRef.current - elapsed);
        setRemainingSeconds(rem);
        if (rem <= 0) {
          handleSessionComplete();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [timerState]);

  const handleStart = () => {
    const now = Date.now();
    startTimeRef.current = now;
    setSessionStartTime(now);
    setSessionStartedIso(new Date().toISOString());
    setTimerState('running');
  };

  const handlePause = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    // Adjust targetSecondsRef to remaining time for when resumed
    targetSecondsRef.current = remainingSeconds;
    startTimeRef.current = null;
    setTimerState('paused');
  };

  const handleResume = () => {
    const now = Date.now();
    startTimeRef.current = now;
    setTimerState('running');
  };

  const handleReset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const totalSec = targetDurationMinutes * 60;
    targetSecondsRef.current = totalSec;
    startTimeRef.current = null;
    setRemainingSeconds(totalSec);
    setTimerState('idle');
  };

  const handleSessionComplete = async () => {
    setTimerState('completed');
    const res = await focusService.recordSession({
      durationMinutes: targetDurationMinutes,
      presetName: selectedPreset,
      startedAt: sessionStartedIso,
      completedAt: new Date().toISOString(),
    });

    setXpEarned(res.xpAwarded || targetDurationMinutes);
    const updatedStats = await focusService.getFocusStats();
    setFocusStats(updatedStats);
  };

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(((targetDurationMinutes * 60 - remainingSeconds) / (targetDurationMinutes * 60)) * 100))
  );

  return (
    <ScreenContainer scrollable style={{ paddingBottom: insets.bottom + 60 }}>
      {/* Header */}
      <PageHeader
        title="Focus Room"
        subtitle="Distraction-free study countdown"
        action={
          <Pressable
            onPress={() => router.back()}
            style={[styles.headerCloseBtn, { borderColor: theme.border }]}
          >
            <MovaIcon name="x" size={16} color={theme.textSecondary} />
          </Pressable>
        }
      />

      {/* Preset Selector */}
      {timerState === 'idle' && (
        <View style={styles.presetsRow}>
          {PRESETS.map((p) => {
            const isSelected = selectedPreset === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setSelectedPreset(p.id)}
                style={[
                  styles.presetPill,
                  {
                    backgroundColor: isSelected ? theme.primarySubtle : theme.surface,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.presetPillTitle,
                    { color: isSelected ? theme.primary : theme.textPrimary },
                  ]}
                >
                  {p.name}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.presetPillSub,
                    { color: isSelected ? theme.primary : theme.textSecondary },
                  ]}
                >
                  {p.id === 'custom' ? `${targetDurationMinutes}m` : `${p.minutes}m`}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Custom Duration Input */}
      {timerState === 'idle' && selectedPreset === 'custom' && (
        <View style={styles.customInputWrap}>
          <ThemedTextInput
            label="Custom Duration (minutes)"
            value={customMinutesInput}
            onChangeText={(text) => {
              const clean = text.replace(/[^0-9]/g, '');
              setCustomMinutesInput(clean);
            }}
            placeholder="e.g. 35"
            keyboardType="number-pad"
            helperText="Enter any study duration from 5 to 240 minutes."
          />
        </View>
      )}

      {/* Main Countdown Display Card */}
      <ThemedCard variant="outlined" style={styles.timerCard}>
        <View style={styles.timerContent}>
          {/* Progress Bar / Ring indicator */}
          <View style={[styles.progressTrack, { backgroundColor: theme.backgroundElement }]}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: timerState === 'completed' ? '#27866A' : theme.primary,
                },
              ]}
            />
          </View>

          {/* Large Digits */}
          <ThemedText style={[styles.timerDigits, { color: theme.text }]}>
            {formatTime(remainingSeconds)}
          </ThemedText>

          <ThemedText type="caption" color="textSecondary" style={styles.timerModeLabel}>
            {timerState === 'completed'
              ? 'SESSION COMPLETE!'
              : timerState === 'running'
              ? `DEEP FOCUS IN PROGRESS (${progressPercent}%)`
              : timerState === 'paused'
              ? 'SESSION PAUSED'
              : `TARGET: ${targetDurationMinutes} MINUTES`}
          </ThemedText>

          {/* Action Buttons */}
          <View style={styles.controlsRow}>
            {timerState === 'idle' && (
              <ThemedButton
                title="Start Focus Session"
                variant="primary"
                size="lg"
                onPress={handleStart}
                style={styles.mainActionBtn}
              />
            )}

            {timerState === 'running' && (
              <View style={styles.splitBtnRow}>
                <ThemedButton
                  title="Pause"
                  variant="outline"
                  size="md"
                  onPress={handlePause}
                  style={{ flex: 1 }}
                />
                <ThemedButton
                  title="Give Up"
                  variant="outline"
                  size="md"
                  onPress={handleReset}
                  style={{ flex: 1, borderColor: theme.error }}
                />
              </View>
            )}

            {timerState === 'paused' && (
              <View style={styles.splitBtnRow}>
                <ThemedButton
                  title="Resume"
                  variant="primary"
                  size="md"
                  onPress={handleResume}
                  style={{ flex: 1 }}
                />
                <ThemedButton
                  title="Reset"
                  variant="outline"
                  size="md"
                  onPress={handleReset}
                  style={{ flex: 1 }}
                />
              </View>
            )}

            {timerState === 'completed' && (
              <View style={{ width: '100%', alignItems: 'center' }}>
                <ThemedCard
                  variant="outlined"
                  style={[styles.xpCelebrationCard, { backgroundColor: theme.primarySubtle }]}
                >
                  <ThemedText style={{ fontSize: 24, marginBottom: 4 }}>🎉</ThemedText>
                  <ThemedText type="bodyStrong" style={{ color: theme.primary, fontWeight: '800' }}>
                    +{xpEarned} XP Earned!
                  </ThemedText>
                  <ThemedText type="caption" color="textSecondary" style={{ textAlign: 'center', marginTop: 2 }}>
                    Great momentum. Your focus session has been permanently logged.
                  </ThemedText>
                </ThemedCard>
                <ThemedButton
                  title="Start Another Session"
                  variant="primary"
                  size="md"
                  onPress={handleReset}
                  style={{ width: '100%', marginTop: Spacing.sm }}
                />
              </View>
            )}
          </View>
        </View>
      </ThemedCard>

      {/* Focus Daily Stats Deck */}
      <View style={styles.statsDeck}>
        <ThemedCard variant="outlined" style={styles.statTile}>
          <ThemedText type="h2" style={{ fontWeight: '800', color: theme.primary }}>
            {focusStats.todayMinutes}m
          </ThemedText>
          <ThemedText type="caption" color="textSecondary">
            Today&apos;s Focus
          </ThemedText>
        </ThemedCard>

        <ThemedCard variant="outlined" style={styles.statTile}>
          <ThemedText type="h2" style={{ fontWeight: '800', color: theme.text }}>
            {focusStats.todaySessions}
          </ThemedText>
          <ThemedText type="caption" color="textSecondary">
            Sessions Done
          </ThemedText>
        </ThemedCard>

        <ThemedCard variant="outlined" style={styles.statTile}>
          <ThemedText type="h2" style={{ fontWeight: '800', color: '#E87532' }}>
            {focusStats.streakDays}d
          </ThemedText>
          <ThemedText type="caption" color="textSecondary">
            Focus Streak
          </ThemedText>
        </ThemedCard>
      </View>

      {/* OS App Blocking Transparency Disclosure Card */}
      <ThemedCard variant="outlined" style={[styles.transparencyCard, { borderColor: theme.border }]}>
        <View style={styles.transparencyHeader}>
          <MovaIcon name="shield" size={16} color={theme.primary} />
          <ThemedText type="bodySmallStrong" style={{ marginLeft: 6, fontWeight: '700' }}>
            Focus Mode & Accountability
          </ThemedText>
        </View>
        <ThemedText type="caption" color="textSecondary" style={styles.transparencyText}>
          Genuine OS-level blocking of third-party applications requires system-level device administration permissions (Apple Screen Time / Android UsageStats) that standard sandboxed mobile applications and browsers cannot access.
        </ThemedText>
        <ThemedText type="caption" color="textMuted" style={[styles.transparencyText, { marginTop: 4 }]}>
          Mova Campus uses high-accountability commitment timers, background elapsed time tracking, and verified XP milestones to keep you focused on your study goals.
        </ThemedText>
      </ThemedCard>

      {/* Recent Sessions List */}
      {focusStats.recentSessions && focusStats.recentSessions.length > 0 && (
        <View style={{ marginTop: Spacing.md }}>
          <SectionHeader title="Recent Focus Sessions" />
          <ThemedCard variant="outlined" style={styles.recentSessionsCard}>
            {focusStats.recentSessions.map((session, idx) => (
              <View
                key={session.id || idx}
                style={[
                  styles.sessionRow,
                  idx > 0 && { borderTopWidth: Borders.thin, borderColor: theme.border },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <ThemedText type="bodySmallStrong">
                    {session.preset_name
                      ? session.preset_name.charAt(0).toUpperCase() + session.preset_name.slice(1)
                      : 'Focus Session'}
                  </ThemedText>
                  <ThemedText type="caption" color="textMuted">
                    {new Date(session.completed_at || session.created_at).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </ThemedText>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <ThemedText type="bodySmallStrong" style={{ color: theme.primary, fontWeight: '700' }}>
                    {session.duration_minutes} mins
                  </ThemedText>
                  <ThemedText type="caption" color="textSecondary">
                    +{session.xp_awarded || session.duration_minutes} XP
                  </ThemedText>
                </View>
              </View>
            ))}
          </ThemedCard>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerCloseBtn: {
    padding: 6,
    borderRadius: Radius.sm,
    borderWidth: Borders.thin,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  presetPill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: Radius.sm,
    borderWidth: Borders.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetPillTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  presetPillSub: {
    fontSize: 11,
    marginTop: 2,
  },
  customInputWrap: {
    marginBottom: Spacing.sm,
  },
  timerCard: {
    padding: Spacing.lg,
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  timerContent: {
    width: '100%',
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  progressBar: {
    height: '100%',
    borderRadius: Radius.full,
  },
  timerDigits: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    marginVertical: Spacing.xs,
  },
  timerModeLabel: {
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: Spacing.lg,
    fontSize: 11,
  },
  controlsRow: {
    width: '100%',
    marginTop: Spacing.sm,
  },
  mainActionBtn: {
    width: '100%',
  },
  splitBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  xpCelebrationCard: {
    width: '100%',
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statsDeck: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginVertical: Spacing.sm,
  },
  statTile: {
    flex: 1,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transparencyCard: {
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  transparencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  transparencyText: {
    lineHeight: 18,
  },
  recentSessionsCard: {
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
});
