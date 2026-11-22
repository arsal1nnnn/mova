/**
 * Mova Campus — Home Dashboard
 *
 * Daily overview for college students:
 * - Personalized greeting & formatted calendar date
 * - Profile avatar and quick profile/campus access
 * - Streak banner with current & best streak ("🔥 7-day streak")
 * - Total points and XP progress bar
 * - Today's class schedule & next lecture indicator
 * - Priority study tasks with instant completion & gamification XP reward
 * - Attendance health card with safe bunk quota & subject comparison chart
 * - Weekly task productivity chart
 * - Quick actions (+ Task, Mark Class, + Class, Friends)
 */

import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

import {
  AttendanceImportModal,
  AttendancePredictionModal,
  AttendanceTrendChart,
  ClassCard,
  ClassFormModal,
  EmptyState,
  MovaIcon,
  PageHeader,
  ScreenContainer,
  SectionHeader,
  SubjectFormModal,
  TaskCard,
  TaskFormModal,
  ThemedButton,
  ThemedCard,
  ThemedText,
  WeeklyTaskChart,
  XpProgressBar,
} from '@/components';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { attendanceService } from '@/services/attendance-service';
import { profileService } from '@/services/profile-service';
import { ACHIEVEMENTS_LIST, rewardService } from '@/services/reward-service';
import { taskService } from '@/services/task-service';
import { timetableService } from '@/services/timetable-service';
import { Borders, Radius, Spacing } from '@/theme';
import {
  formatAttendancePercentage,
  getAttendanceStatusLabel,
} from '@/utils/attendance-validators';
import {
  calculateActivityStreak,
  extractActivityDates,
} from '@/utils/streak-calculator';

function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getGreeting(profile, user) {
  const baseGreeting = getTimeBasedGreeting();
  if (profile?.name?.trim()) {
    return `${baseGreeting}, ${profile.name.trim().split(' ')[0]}`;
  }
  const metadataName = user?.user_metadata?.full_name || user?.user_metadata?.name;
  if (metadataName?.trim()) {
    return `${baseGreeting}, ${metadataName.trim().split(' ')[0]}`;
  }
  if (user?.email) {
    const emailPrefix = user.email.split('@')[0];
    return `${baseGreeting}, ${emailPrefix}`;
  }
  return baseGreeting;
}

function getFormattedDate() {
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    }).format(new Date());
  } catch {
    return 'Today';
  }
}

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [userStats, setUserStats] = useState({ totalPoints: 0, totalXp: 0, ledger: [] });
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);

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
        const [profRes, statsRes, achRes, taskRes, classRes, nextClassRes, attRes] =
          await Promise.all([
            profileService.getProfile(),
            rewardService.getUserStats(),
            rewardService.getUnlockedAchievements(),
            taskService.isConfigured() ? taskService.getTasks({ status: 'all' }) : { tasks: [] },
            timetableService.isConfigured() ? timetableService.getTodayClasses(now) : { classes: [] },
            timetableService.isConfigured() ? timetableService.getUpcomingClasses({ limit: 1, now }) : { upcoming: [] },
            attendanceService.isConfigured() ? attendanceService.getSubjectsWithSummaries() : { subjects: [] },
          ]);

        if (!isMounted) return;

        if (profRes.profile) setProfile(profRes.profile);
        if (statsRes) setUserStats(statsRes);
        if (achRes.achievements) setUnlockedAchievements(achRes.achievements);

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

        // Check for streak milestone rewards
        if (calculatedStreak.currentStreak >= 3) {
          await rewardService.awardStreakMilestone(
            calculatedStreak.currentStreak >= 7 ? 7 : 3,
            now.toISOString().slice(0, 10)
          );
        }
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
    setPendingTasks((prev) => prev.filter((t) => t.id !== task.id));
    setAllTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, is_completed: nextCompleted } : t))
    );

    try {
      await taskService.toggleTaskCompletion(task.id, nextCompleted);

      if (nextCompleted) {
        // Award XP and points idempotently
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
      // Revert on error
      setReloadTrigger((p) => p + 1);
    }
  };

  const nextClassLabel = nextClass
    ? `${nextClass.class?.subject_name || 'Class'} (${nextClass.class?.start_time})`
    : null;

  return (
    <ScreenContainer scroll style={{ paddingBottom: 80 }}>
      {/* 1. Header Bar with Greeting and Profile Button */}
      <View style={styles.topHeader}>
        <View style={{ flex: 1 }}>
          <ThemedText type="caption" color="textSecondary" style={{ fontWeight: '500' }}>
            {getFormattedDate()}
          </ThemedText>
          <ThemedText type="h1" style={{ fontWeight: '800', marginTop: 2 }}>
            {getGreeting(profile, user)}
          </ThemedText>
        </View>

        <Pressable
          onPress={() => router.push('/(app)/profile')}
          style={styles.profileAvatarBtn}
          accessibilityLabel="Open profile"
        >
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primarySubtle }]}>
              <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
                {(profile?.name || 'S').charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          )}
        </Pressable>
      </View>

      {/* 2. Streak & Consistency Pill */}
      <View style={[styles.streakBanner, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.streakLeft}>
          <ThemedText style={{ fontSize: 22 }}>🔥</ThemedText>
          <View style={{ marginLeft: Spacing.sm }}>
            <ThemedText type="bodyStrong" style={{ fontWeight: '800' }}>
              {streak.currentStreak > 0 ? `${streak.currentStreak}-Day Streak` : 'Start Your Streak'}
            </ThemedText>
            <ThemedText type="caption" color="textSecondary">
              {streak.longestStreak > 0 ? `Best streak: ${streak.longestStreak} days` : 'Complete tasks to build momentum'}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.streakPointsTag, { backgroundColor: theme.primarySubtle }]}>
          <MovaIcon name="sparkle" size={12} color={theme.primary} />
          <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '800', marginLeft: 4 }}>
            {userStats.totalPoints} pts
          </ThemedText>
        </View>
      </View>

      {/* 3. XP & Level Progress */}
      <XpProgressBar
        totalPoints={userStats.totalPoints}
        totalXp={userStats.totalXp}
        style={{ marginTop: Spacing.xs, marginBottom: Spacing.sm }}
      />

      {/* 4. Quick Action Grid */}
      <View style={styles.quickActionRow}>
        <Pressable
          style={[styles.quickActionBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => setTaskModalVisible(true)}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: '#FDF1EB' }]}>
            <MovaIcon name="plus" size={16} color={theme.primary} />
          </View>
          <ThemedText type="caption" style={{ fontWeight: '700', marginTop: 4 }}>
            + Task
          </ThemedText>
        </Pressable>

        <Pressable
          style={[styles.quickActionBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => setClassModalVisible(true)}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: '#F0F9F5' }]}>
            <MovaIcon name="timetable" size={16} color={theme.success} />
          </View>
          <ThemedText type="caption" style={{ fontWeight: '700', marginTop: 4 }}>
            + Class
          </ThemedText>
        </Pressable>

        <Pressable
          style={[styles.quickActionBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.push('/(app)/attendance')}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: '#EFF6FF' }]}>
            <MovaIcon name="attendance" size={16} color="#2563EB" />
          </View>
          <ThemedText type="caption" style={{ fontWeight: '700', marginTop: 4 }}>
            Attendance
          </ThemedText>
        </Pressable>

        <Pressable
          style={[styles.quickActionBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.push('/(app)/profile')}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: '#FAF5FF' }]}>
            <MovaIcon name="users" size={16} color="#7C3AED" />
          </View>
          <ThemedText type="caption" style={{ fontWeight: '700', marginTop: 4 }}>
            Friends
          </ThemedText>
        </Pressable>
      </View>

      {/* 5. Today's Class Routine */}
      <View style={styles.section}>
        <SectionHeader
          title="Today's Classes"
          badge={todayClasses.length > 0 ? `${todayClasses.length} Scheduled` : null}
          action={
            <Pressable hitSlop={8} onPress={() => router.push('/(app)/timetable')}>
              <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700' }}>
                Full Week →
              </ThemedText>
            </Pressable>
          }
        />

        {isTimetableLoading ? (
          <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: Spacing.md }} />
        ) : todayClasses.length > 0 ? (
          <View style={{ gap: Spacing.xs }}>
            {todayClasses.slice(0, 3).map((slot) => (
              <ClassCard
                key={slot.id}
                classSlot={slot}
                isNext={nextClass?.class?.id === slot.id}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            iconName="timetable"
            title="No Classes Today"
            description={
              nextClassLabel
                ? `Next upcoming: ${nextClassLabel}.`
                : 'Add your recurring timetable once to view daily lectures.'
            }
            action={
              <ThemedButton
                title="+ Add Class"
                size="sm"
                variant="primary"
                onPress={() => setClassModalVisible(true)}
              />
            }
          />
        )}
      </View>

      {/* 6. Priority Tasks / Daily Focus */}
      <View style={styles.section}>
        <SectionHeader
          title="Priority Tasks"
          badge={pendingTasks.length > 0 ? `${pendingTasks.length} Pending` : null}
          action={
            <Pressable hitSlop={8} onPress={() => router.push('/(app)/tasks')}>
              <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700' }}>
                All Tasks →
              </ThemedText>
            </Pressable>
          }
        />

        {pendingTasks.length > 0 ? (
          <View style={{ gap: Spacing.xs }}>
            {pendingTasks.slice(0, 3).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleComplete={() => handleToggleTask(task)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            iconName="check"
            title="All Caught Up!"
            description="You have no pending tasks for today. Add a study assignment to earn XP."
            action={
              <ThemedButton
                title="+ Create Task"
                size="sm"
                variant="primary"
                onPress={() => setTaskModalVisible(true)}
              />
            }
          />
        )}
      </View>

      {/* 7. Attendance Overview & Safe Bunk Analytics */}
      <View style={styles.section}>
        <SectionHeader
          title="Attendance Health"
          action={
            <Pressable hitSlop={8} onPress={() => setPredictionModalVisible(true)}>
              <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700' }}>
                Forecast Exams →
              </ThemedText>
            </Pressable>
          }
        />

        {overallAttendance && overallAttendance.totalClasses > 0 ? (
          <ThemedCard variant="outlined" style={styles.attendanceCard}>
            <View style={styles.attendanceRow}>
              <View>
                <ThemedText type="caption" color="textSecondary">
                  Overall Aggregate
                </ThemedText>
                <ThemedText
                  type="display"
                  style={{
                    fontWeight: '800',
                    color:
                      overallAttendance.overallPercentage >= 75
                        ? theme.success
                        : theme.error,
                  }}
                >
                  {formatAttendancePercentage(overallAttendance.overallPercentage)}
                </ThemedText>
                <ThemedText type="caption" color="textMuted">
                  {overallAttendance.totalAttended} attended of {overallAttendance.totalClasses} conducted
                </ThemedText>
              </View>

              <View style={styles.attendanceRightCol}>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor:
                        overallAttendance.overallPercentage >= 75
                          ? '#E8F5E9'
                          : '#FFEBEE',
                    },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{
                      fontWeight: '800',
                      color:
                        overallAttendance.overallPercentage >= 75
                          ? '#2E7D32'
                          : '#C62828',
                    }}
                  >
                    {overallAttendance.overallPercentage >= 75 ? 'Safe' : 'At Risk'}
                  </ThemedText>
                </View>

                <ThemedText type="caption" color="textSecondary" style={{ marginTop: 6, fontSize: 11 }}>
                  {overallAttendance.totalSafeBunks > 0
                    ? `+${overallAttendance.totalSafeBunks} safe bunks`
                    : overallAttendance.totalToRecover > 0
                    ? `Attend next ${overallAttendance.totalToRecover} in a row`
                    : 'Target Met'}
                </ThemedText>
              </View>
            </View>

            {/* Subject Comparison Chart */}
            <AttendanceTrendChart
              subjects={subjectsWithSummaries.slice(0, 4)}
              style={{ marginTop: Spacing.sm }}
            />
          </ThemedCard>
        ) : (
          <EmptyState
            iconName="attendance"
            title="No Attendance Configured"
            description="Upload an attendance report (PDF/IMG) or set up your baseline subjects manually."
            action={
              <ThemedButton
                title="Setup Attendance"
                size="sm"
                variant="primary"
                onPress={() => setAttendanceImportVisible(true)}
              />
            }
          />
        )}
      </View>

      {/* 8. Weekly Productivity Bar Chart */}
      <View style={styles.section}>
        <WeeklyTaskChart tasks={allTasks} />
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
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  profileAvatarBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#EEEAE4',
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
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  streakBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: Borders.thin,
    marginBottom: Spacing.xs,
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakPointsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginVertical: Spacing.xs,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: Borders.thin,
  },
  actionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginTop: Spacing.md,
  },
  attendanceCard: {
    padding: Spacing.md,
  },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  attendanceRightCol: {
    alignItems: 'flex-end',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
});
