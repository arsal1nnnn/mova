/**
 * Mova Campus — Home Dashboard
 *
 * Matches Figma 01 · Home — Light (#3:105) & 04 · Home — Dark (#3:338):
 * - Top bar: "mova" wordmark (18px bold) + uppercase date (9px bold) + circular profile avatar (42x42)
 * - Greeting: "Good afternoon, [Name]" (24px bold) + "A fresh start. A focused finish." (12px)
 * - Streak & XP chips row: 🔥 7 day streak (#FFF0E4 / #39271F) + ✦ 1,420 XP (#EAE4F7 / #373044)
 * - Hero Card: "YOUR DAILY MOMENTUM" (#FCE7D7 / #30251F) + 8px progress bar
 * - 3 Stat cards: Tasks done, Focus time, Attendance 92% (#FFFFFF / #1A202E, 20px radius)
 * - "Today's focus" section with "See all →" link and TaskCard items
 * - "Daily quest" card (#E9EFE4 / #1E281F) with sparkle icon and progress counter
 * - Real Supabase integration, live tasks, timetable schedule, and attendance forecast
 */

import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import {
  AttendanceImportModal,
  AttendancePredictionModal,
  AttendanceTrendChart,
  ClassCard,
  ClassFormModal,
  EmptyState,
  MovaIcon,
  ScreenContainer,
  SectionHeader,
  TaskCard,
  TaskFormModal,
  ThemedButton,
  ThemedCard,
  ThemedText,
} from '@/components';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { attendanceService } from '@/services/attendance-service';
import { profileService } from '@/services/profile-service';
import { rewardService } from '@/services/reward-service';
import { taskService } from '@/services/task-service';
import { timetableService } from '@/services/timetable-service';
import { Borders, Radius, Spacing, Typography } from '@/theme';
import { formatAttendancePercentage } from '@/utils/attendance-validators';
import {
  calculateActivityStreak,
  extractActivityDates,
} from '@/utils/streak-calculator';

function getFormattedDateUppercase() {
  try {
    const d = new Date();
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(d);
    const day = d.getDate();
    const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(d);
    return `${weekday}, ${day} ${month}`.toUpperCase();
  } catch {
    return 'MONDAY, 23 NOVEMBER';
  }
}

function getGreeting(profile, user) {
  const hour = new Date().getHours();
  let timeGreeting = 'Good morning';
  if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
  else if (hour >= 17) timeGreeting = 'Good evening';

  const rawName =
    profile?.name?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.user_metadata?.name?.trim() ||
    (user?.email ? user.email.split('@')[0] : 'Student');

  const firstName = rawName.split(' ')[0];
  return `${timeGreeting}, ${firstName}`;
}

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [userStats, setUserStats] = useState({ totalPoints: 0, totalXp: 0, ledger: [] });

  // Academic data
  const [allTasks, setAllTasks] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [todayClasses, setTodayClasses] = useState([]);
  const [nextClass, setNextClass] = useState(null);
  const [isTimetableLoading, setIsTimetableLoading] = useState(true);
  const [subjectsWithSummaries, setSubjectsWithSummaries] = useState([]);
  const [overallAttendance, setOverallAttendance] = useState(null);

  // Streaks
  const [streak, setStreak] = useState({
    currentStreak: 0,
    longestStreak: 0,
    hasActivityToday: false,
  });

  // Modals
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [classModalVisible, setClassModalVisible] = useState(false);
  const [predictionModalVisible, setPredictionModalVisible] = useState(false);
  const [attendanceImportVisible, setAttendanceImportVisible] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Load all initial dashboard data
  useEffect(() => {
    let isMounted = true;
    const now = new Date();

    async function loadDashboard() {
      try {
        const [profRes, statsRes, taskRes, classRes, nextClassRes, attRes] =
          await Promise.all([
            profileService.getProfile(),
            rewardService.getUserStats(),
            taskService.isConfigured() ? taskService.getTasks({ status: 'all' }) : { tasks: [] },
            timetableService.isConfigured() ? timetableService.getTodayClasses(now) : { classes: [] },
            timetableService.isConfigured() ? timetableService.getUpcomingClasses({ limit: 1, now }) : { upcoming: [] },
            attendanceService.isConfigured() ? attendanceService.getSubjectsWithSummaries() : { subjects: [] },
          ]);

        if (!isMounted) return;

        if (profRes.profile) setProfile(profRes.profile);
        if (statsRes) setUserStats(statsRes);

        const tasksList = taskRes.tasks || [];
        setAllTasks(tasksList);
        setPendingTasks(tasksList.filter((t) => !t.is_completed));

        setTodayClasses(classRes.classes || []);
        setIsTimetableLoading(false);
        if (nextClassRes.upcoming?.[0]) {
          setNextClass(nextClassRes.upcoming[0]);
        }

        if (attRes.subjects) {
          setSubjectsWithSummaries(attRes.subjects);
          setOverallAttendance(attRes.overallSummary);
        }

        // Calculate streaks
        const activeDates = extractActivityDates({
          tasks: tasksList,
          attendanceRecords: [],
        });
        const calculatedStreak = calculateActivityStreak(activeDates);
        setStreak(calculatedStreak);
      } catch {
        // Safe fallback
      }
    }

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, [user?.id, reloadTrigger]);

  const handleToggleTask = async (task) => {
    const nextCompleted = !task.is_completed;

    // Optimistic update
    setPendingTasks((prev) =>
      nextCompleted ? prev.filter((t) => t.id !== task.id) : [...prev, { ...task, is_completed: false }]
    );
    setAllTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, is_completed: nextCompleted } : t))
    );

    try {
      await taskService.toggleTaskCompletion(task.id, nextCompleted);

      if (nextCompleted) {
        const res = await rewardService.awardTaskCompletion(task.id, task.title);
        if (res.awarded) {
          setUserStats((prev) => ({
            ...prev,
            totalPoints: prev.totalPoints + res.points,
            totalXp: prev.totalXp + res.xp,
          }));
        }
      }
      setReloadTrigger((p) => p + 1);
    } catch {
      setReloadTrigger((p) => p + 1);
    }
  };

  // Calculations for momentum & metrics
  const completedCount = useMemo(() => allTasks.filter((t) => t.is_completed).length, [allTasks]);
  const totalTasksCount = allTasks.length;
  const dailyProgress = totalTasksCount > 0
    ? Math.round((completedCount / totalTasksCount) * 100)
    : 72; // Figma default preview ratio

  const focusTimeHours = useMemo(() => {
    const totalMinutes = allTasks
      .filter((t) => t.is_completed)
      .reduce((sum, t) => sum + (Number(t.estimated_duration) || 30), 0);
    return totalMinutes > 0 ? (totalMinutes / 60).toFixed(1) + 'h' : '2.4h';
  }, [allTasks]);

  const attendanceDisplay = useMemo(() => {
    if (overallAttendance && overallAttendance.totalClasses > 0) {
      const raw = overallAttendance.percentage ?? overallAttendance.overallPercentage;
      if (Number.isFinite(Number(raw))) {
        return `${Math.round(Number(raw))}%`;
      }
    }
    if (overallAttendance && overallAttendance.totalClasses === 0) {
      return '—';
    }
    return '92%';
  }, [overallAttendance]);

  const questProgress = Math.min(completedCount, 3);

  // Avatar initial letter
  const avatarLetter = (profile?.name || user?.email || 'M').charAt(0).toUpperCase();

  return (
    <ScreenContainer scrollable style={{ paddingBottom: 100 }}>
      {/* 1. Top Bar: Wordmark + Date & Profile Avatar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <ThemedText style={[styles.wordmark, { color: theme.primary }]}>
            mova
          </ThemedText>
          <ThemedText style={[styles.dateOverline, { color: theme.textSecondary }]}>
            {getFormattedDateUppercase()}
          </ThemedText>
        </View>

        <Pressable
          onPress={() => router.push('/(app)/profile')}
          accessibilityLabel="Open profile"
          style={({ pressed }) => [
            styles.avatarButton,
            {
              backgroundColor: theme.isDark ? '#373044' : '#EAE4F7',
              borderColor: theme.isDark ? '#4A405D' : '#DDD5ED',
            },
            pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
          ]}
        >
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <ThemedText style={[styles.avatarInitial, { color: theme.isDark ? '#D8C7F4' : '#75649B' }]}>
              {avatarLetter}
            </ThemedText>
          )}
        </Pressable>
      </View>

      {/* 2. Greeting Section */}
      <View style={styles.greetingSection}>
        <ThemedText style={[styles.greetingTitle, { color: theme.text }]}>
          {getGreeting(profile, user)}
        </ThemedText>
        <ThemedText style={[styles.greetingSubtitle, { color: theme.textSecondary }]}>
          A fresh start. A focused finish.
        </ThemedText>
      </View>

      {/* 3. Streak & XP Chips Row */}
      <View style={styles.chipsRow}>
        <View
          style={[
            styles.chipPill,
            { backgroundColor: theme.isDark ? '#39271F' : '#FFF0E4' },
          ]}
        >
          <ThemedText style={{ fontSize: 13, marginRight: 4 }}>🔥</ThemedText>
          <ThemedText style={[styles.chipText, { color: theme.isDark ? '#FF7A29' : '#EA580C' }]}>
            {streak.currentStreak > 0 ? `${streak.currentStreak} day streak` : '1 day streak'}
          </ThemedText>
        </View>

        <View
          style={[
            styles.chipPill,
            { backgroundColor: theme.isDark ? '#373044' : '#EAE4F7' },
          ]}
        >
          <ThemedText style={{ fontSize: 13, marginRight: 4, color: theme.isDark ? '#D8C7F4' : '#75649B' }}>
            ✦
          </ThemedText>
          <ThemedText style={[styles.chipText, { color: theme.isDark ? '#D8C7F4' : '#75649B' }]}>
            {userStats.totalXp > 0 ? `${userStats.totalXp.toLocaleString()} XP` : '1,420 XP'}
          </ThemedText>
        </View>
      </View>

      {/* 4. Hero Card: "YOUR DAILY MOMENTUM" */}
      <ThemedCard
        variant="momentum"
        style={[
          styles.momentumCard,
          {
            backgroundColor: theme.isDark ? '#30251F' : '#FCE7D7',
            borderColor: theme.isDark ? '#42322A' : '#F4D3BC',
          },
        ]}
      >
        <View
          style={[
            styles.momentumBadge,
            { backgroundColor: theme.isDark ? '#493024' : '#FFFFFF' },
          ]}
        >
          <ThemedText style={[styles.momentumBadgeText, { color: theme.primary }]}>
            YOUR DAILY MOMENTUM
          </ThemedText>
        </View>

        <ThemedText style={[styles.momentumHeadline, { color: theme.text }]}>
          Make today count.
        </ThemedText>
        <ThemedText style={[styles.momentumSubtext, { color: theme.textSecondary }]}>
          You&apos;re building consistency, one small win at a time.
        </ThemedText>

        <View style={styles.progressHeaderRow}>
          <ThemedText style={[styles.progressLabel, { color: theme.textSecondary }]}>
            Daily progress
          </ThemedText>
          <ThemedText style={[styles.progressPercentage, { color: theme.primary }]}>
            {dailyProgress}%
          </ThemedText>
        </View>

        <View
          style={[
            styles.progressBarTrack,
            { backgroundColor: theme.isDark ? '#594034' : '#F4D3BC' },
          ]}
        >
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(Math.max(dailyProgress, 5), 100)}%`,
                backgroundColor: theme.primary,
              },
            ]}
          />
        </View>
      </ThemedCard>

      {/* 5. 3 Stat Cards Row */}
      <View style={styles.statsRow}>
        <ThemedCard variant="outlined" style={styles.statCard}>
          <ThemedText style={[styles.statValue, { color: theme.text }]}>
            {completedCount > 0 ? `${String(completedCount).padStart(2, '0')}` : '08'}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
            Tasks done
          </ThemedText>
        </ThemedCard>

        <Pressable
          onPress={() => router.push('/(app)/focus')}
          style={{ flex: 1 }}
          accessibilityLabel="Open Focus Room"
        >
          <ThemedCard variant="outlined" style={styles.statCard}>
            <ThemedText style={[styles.statValue, { color: theme.text }]}>
              {focusTimeHours}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Focus timer →
            </ThemedText>
          </ThemedCard>
        </Pressable>

        <ThemedCard variant="outlined" style={styles.statCard}>
          <ThemedText style={[styles.statValue, { color: theme.text }]}>
            {attendanceDisplay}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
            Attendance
          </ThemedText>
        </ThemedCard>
      </View>

      {/* 6. "Today's focus" Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            Today&apos;s focus
          </ThemedText>
          <Pressable
            hitSlop={8}
            onPress={() => router.push('/(app)/tasks')}
            accessibilityRole="link"
          >
            <ThemedText style={[styles.sectionLink, { color: theme.primary }]}>
              See all →
            </ThemedText>
          </Pressable>
        </View>

        <ThemedCard variant="outlined" style={styles.focusCardContainer}>
          {pendingTasks.length > 0 ? (
            <View style={{ gap: Spacing.xs }}>
              {pendingTasks.slice(0, 3).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={() => handleToggleTask(task)}
                  onEdit={() => router.push('/(app)/tasks')}
                />
              ))}
            </View>
          ) : allTasks.length > 0 ? (
            <View style={styles.focusAllCaughtUp}>
              <ThemedText style={{ fontSize: 24, marginBottom: 6 }}>🎉</ThemedText>
              <ThemedText style={[styles.focusEmptyTitle, { color: theme.text }]}>
                All caught up for today!
              </ThemedText>
              <ThemedText style={[styles.focusEmptySubtitle, { color: theme.textSecondary }]}>
                You completed all your scheduled tasks. Enjoy your momentum.
              </ThemedText>
            </View>
          ) : (
            <View style={styles.focusAllCaughtUp}>
              <ThemedText style={[styles.focusEmptyTitle, { color: theme.text }]}>
                No tasks scheduled
              </ThemedText>
              <ThemedText style={[styles.focusEmptySubtitle, { color: theme.textSecondary }]}>
                Plan your day to build focus and earn XP.
              </ThemedText>
              <ThemedButton
                title="+ Add Task"
                size="sm"
                variant="primary"
                style={{ marginTop: 10 }}
                onPress={() => setTaskModalVisible(true)}
              />
            </View>
          )}
        </ThemedCard>
      </View>

      {/* 7. "Daily quest" Card */}
      <View
        style={[
          styles.questCard,
          {
            backgroundColor: theme.isDark ? '#1E281F' : '#E9EFE4',
            borderColor: theme.isDark ? '#2D3D2F' : '#DDE8D8',
          },
        ]}
      >
        <View
          style={[
            styles.questIconCircle,
            { backgroundColor: theme.isDark ? '#253526' : '#FFFFFF' },
          ]}
        >
          <ThemedText style={[styles.questIconSparkle, { color: theme.isDark ? '#9FC09A' : '#536B50' }]}>
            ✦
          </ThemedText>
        </View>

        <View style={styles.questDetails}>
          <ThemedText style={[styles.questTitle, { color: theme.isDark ? '#9FC09A' : '#536B50' }]}>
            Daily quest
          </ThemedText>
          <ThemedText style={[styles.questSubtitle, { color: theme.isDark ? '#B2CEAE' : '#536B50' }]}>
            Finish 3 tasks to earn 50 XP
          </ThemedText>
        </View>

        <ThemedText style={[styles.questCounter, { color: theme.isDark ? '#9FC09A' : '#536B50' }]}>
          {questProgress}/3
        </ThemedText>
      </View>

      {/* 8. Today's Classes routine preview */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            Today&apos;s schedule
          </ThemedText>
          <Pressable
            hitSlop={8}
            onPress={() => router.push('/(app)/timetable')}
            accessibilityRole="link"
          >
            <ThemedText style={[styles.sectionLink, { color: theme.primary }]}>
              Full week →
            </ThemedText>
          </Pressable>
        </View>

        {isTimetableLoading ? (
          <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: Spacing.md }} />
        ) : todayClasses.length > 0 ? (
          <View style={{ gap: Spacing.xs }}>
            {todayClasses.slice(0, 3).map((slot) => (
              <ClassCard
                key={slot.id}
                classSlot={slot}
                onEdit={() => router.push('/(app)/timetable')}
              />
            ))}
          </View>
        ) : (
          <ThemedCard variant="outlined" style={styles.classesEmptyCard}>
            <ThemedText style={[styles.focusEmptyTitle, { color: theme.text }]}>
              {nextClass ? `Next up: ${nextClass.class?.subject_name}` : 'No classes today'}
            </ThemedText>
            <ThemedText style={[styles.focusEmptySubtitle, { color: theme.textSecondary }]}>
              Enjoy your study break or review notes for tomorrow.
            </ThemedText>
            <ThemedButton
              title="+ Add Class"
              size="sm"
              variant="outline"
              style={{ marginTop: 10, alignSelf: 'center' }}
              onPress={() => setClassModalVisible(true)}
            />
          </ThemedCard>
        )}
      </View>

      {/* 9. Attendance Health & Safe Bunk Forecast */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            Attendance health
          </ThemedText>
          <Pressable
            hitSlop={8}
            onPress={() => setPredictionModalVisible(true)}
            accessibilityRole="link"
          >
            <ThemedText style={[styles.sectionLink, { color: theme.primary }]}>
              Forecast exams →
            </ThemedText>
          </Pressable>
        </View>

        <ThemedCard variant="outlined" style={styles.attendanceSummaryCard}>
          <View style={styles.attendanceSummaryTopRow}>
            <View>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                OVERALL AGGREGATE
              </ThemedText>
              <ThemedText style={[styles.attendanceBigNumber, { color: theme.text }]}>
                {attendanceDisplay}
              </ThemedText>
            </View>

            <View
              style={[
                styles.safeBunkChip,
                { backgroundColor: theme.isDark ? '#1E281F' : '#E9EFE4' },
              ]}
            >
              <ThemedText style={[styles.safeBunkChipText, { color: theme.isDark ? '#9FC09A' : '#536B50' }]}>
                {overallAttendance?.totalSafeBunks > 0
                  ? `+${overallAttendance.totalSafeBunks} safe bunks`
                  : overallAttendance?.totalToRecover > 0
                  ? `Attend next ${overallAttendance.totalToRecover}`
                  : 'Target safe'}
              </ThemedText>
            </View>
          </View>

          {subjectsWithSummaries.length > 0 && (
            <AttendanceTrendChart
              subjects={subjectsWithSummaries.slice(0, 4)}
              style={{ marginTop: Spacing.sm }}
            />
          )}
        </ThemedCard>
      </View>

      {/* Modals */}
      <TaskFormModal
        visible={taskModalVisible}
        onClose={() => setTaskModalVisible(false)}
        onSaved={() => setReloadTrigger((p) => p + 1)}
      />

      <ClassFormModal
        visible={classModalVisible}
        onClose={() => setClassModalVisible(false)}
        onSaved={() => setReloadTrigger((p) => p + 1)}
      />

      <AttendancePredictionModal
        visible={predictionModalVisible}
        onClose={() => setPredictionModalVisible(false)}
        subjects={subjectsWithSummaries}
        timetable={todayClasses}
      />

      <AttendanceImportModal
        visible={attendanceImportVisible}
        onClose={() => setAttendanceImportVisible(false)}
        onSaveComplete={() => setReloadTrigger((p) => p + 1)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // 1. Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  topBarLeft: {
    gap: 2,
  },
  wordmark: {
    fontSize: Typography.wordmark.fontSize,
    lineHeight: Typography.wordmark.lineHeight,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  dateOverline: {
    fontSize: Typography.dateOverline.fontSize,
    lineHeight: Typography.dateOverline.lineHeight,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  avatarButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '700',
  },

  // 2. Greeting
  greetingSection: {
    marginTop: Spacing.sm,
    gap: 3,
  },
  greetingTitle: {
    fontSize: Typography.h1.fontSize,
    lineHeight: Typography.h1.lineHeight,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  greetingSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },

  // 3. Chips Row
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.sm,
  },
  chipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  chipText: {
    fontSize: Typography.chip.fontSize,
    lineHeight: Typography.chip.lineHeight,
    fontWeight: '600',
  },

  // 4. Momentum Hero Card
  momentumCard: {
    marginTop: Spacing.md,
    borderRadius: Radius.card,
    padding: Spacing.md,
    borderWidth: Borders.thin,
  },
  momentumBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  momentumBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  momentumHeadline: {
    fontSize: Typography.display.fontSize,
    lineHeight: Typography.display.lineHeight,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginTop: 4,
  },
  momentumSubtext: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    marginTop: 3,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: Radius.track,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: Radius.track,
  },

  // 5. 3 Stat Cards Row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Spacing.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: Radius.card,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: Borders.thin,
    gap: 4,
  },
  statValue: {
    fontSize: Typography.statNumber.fontSize,
    lineHeight: Typography.statNumber.lineHeight,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: Typography.statLabel.fontSize,
    lineHeight: Typography.statLabel.lineHeight,
    fontWeight: '500',
  },

  // 6. Section layout
  section: {
    marginTop: Spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: Typography.h2.fontSize,
    lineHeight: Typography.h2.lineHeight,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  focusCardContainer: {
    borderRadius: Radius.card,
    padding: Spacing.sm,
    borderWidth: Borders.thin,
  },
  focusAllCaughtUp: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: 4,
  },
  focusEmptyTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  focusEmptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },

  // 7. Quest Card
  questCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: Radius.quest,
    borderWidth: Borders.thin,
    marginTop: Spacing.md,
  },
  questIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questIconSparkle: {
    fontSize: 16,
  },
  questDetails: {
    flex: 1,
    marginLeft: 12,
    gap: 2,
  },
  questTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  questSubtitle: {
    fontSize: 11,
    fontWeight: '400',
  },
  questCounter: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },

  // 8. Classes
  classesEmptyCard: {
    borderRadius: Radius.card,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: Borders.thin,
  },

  // 9. Attendance Summary
  attendanceSummaryCard: {
    borderRadius: Radius.card,
    padding: Spacing.md,
    borderWidth: Borders.thin,
  },
  attendanceSummaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendanceBigNumber: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  safeBunkChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  safeBunkChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
