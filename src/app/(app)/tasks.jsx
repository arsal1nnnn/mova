/**
 * Mova Dedicated Task Management Screen
 *
 * Matches Figma 02 · Tasks — Light (#3:179):
 * - Header: "Your tasks" (24px bold) + "Small steps. Big progress." (12px) + circular "+" button (44x44, #EA580C)
 * - 3 Stat counter cards: "To do", "Completed", "Overdue" (20px radius cards)
 * - Filter chips: "All tasks", "Today", "Upcoming" (rounded 50px pills)
 * - Grouped task sections: "Today · [Date]" and "Upcoming" inside 20px radius containers
 * - TaskCard items with 21x21 circular checkbox, 13px title, 10px subtitle, pill time badge
 * - Real Supabase data, optimistic completion, reward XP engine, create/edit/delete modals
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import {
  EmptyState,
  MovaIcon,
  ProfileModal,
  ScreenContainer,
  TaskCard,
  TaskFilterBar,
  TaskFormModal,
  ThemedButton,
  ThemedCard,
  ThemedText,
} from '@/components';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { profileService } from '@/services/profile-service';
import { rewardService } from '@/services/reward-service';
import { taskService } from '@/services/task-service';
import { Borders, Radius, Spacing, Typography } from '@/theme';

function getTodayFormattedShort() {
  try {
    const d = new Date();
    const day = d.getDate();
    const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(d);
    return `${day} ${month}`;
  } catch {
    return '23 Nov';
  }
}

export default function TasksScreen() {
  const theme = useTheme();
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const [allTasks, setAllTasks] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isUnconfigured, setIsUnconfigured] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Active filter tab: 'all' | 'today' | 'upcoming' | 'completed'
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState(null);

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  function showAlert(title, message) {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  }

  // Load profile
  useEffect(() => {
    let isMounted = true;
    profileService.getProfile().then(({ profile: p }) => {
      if (isMounted && p) setProfile(p);
    });
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Load tasks from Supabase
  useEffect(() => {
    let isMounted = true;

    async function fetchTasks() {
      if (!taskService.isConfigured()) {
        if (isMounted) {
          setIsUnconfigured(true);
          setIsLoading(false);
          setIsRefreshing(false);
        }
        return;
      }

      try {
        const { tasks: allUserTasks, error: allErr } = await taskService.getTasks({ status: 'all' });
        if (isMounted && allUserTasks) {
          setAllTasks(allUserTasks);
        }

        const { tasks: taskData, error } = await taskService.getTasks({
          status: activeTab === 'completed' ? 'completed' : 'all',
          category: categoryFilter,
          priority: priorityFilter,
          search: searchQuery,
        });

        if (!isMounted) return;

        if (error) {
          setErrorMessage(error.message || 'Failed to load tasks.');
        } else {
          setTasks(taskData || []);
          setErrorMessage(null);
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    fetchTasks();
    return () => {
      isMounted = false;
    };
  }, [activeTab, categoryFilter, priorityFilter, searchQuery, reloadTrigger]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setReloadTrigger((prev) => prev + 1);
  };

  // Metrics calculations
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const toDoCount = useMemo(() => allTasks.filter((t) => !t.is_completed).length, [allTasks]);
  const completedCount = useMemo(() => allTasks.filter((t) => t.is_completed).length, [allTasks]);
  const overdueCount = useMemo(
    () => allTasks.filter((t) => !t.is_completed && t.due_date && t.due_date < todayStr).length,
    [allTasks, todayStr]
  );

  // Grouped tasks filtering
  const filteredTasks = useMemo(() => {
    let list = tasks;

    if (activeTab === 'today') {
      list = list.filter((t) => !t.is_completed && (!t.due_date || t.due_date <= todayStr));
    } else if (activeTab === 'upcoming') {
      list = list.filter((t) => !t.is_completed && t.due_date && t.due_date > todayStr);
    } else if (activeTab === 'completed') {
      list = list.filter((t) => t.is_completed);
    }

    return list;
  }, [tasks, activeTab, todayStr]);

  const todayGroup = useMemo(() => {
    if (activeTab === 'upcoming' || activeTab === 'completed') return [];
    return filteredTasks.filter((t) => !t.is_completed && (!t.due_date || t.due_date <= todayStr));
  }, [filteredTasks, activeTab, todayStr]);

  const upcomingGroup = useMemo(() => {
    if (activeTab === 'today' || activeTab === 'completed') return [];
    return filteredTasks.filter((t) => !t.is_completed && t.due_date && t.due_date > todayStr);
  }, [filteredTasks, activeTab, todayStr]);

  const completedGroup = useMemo(() => {
    if (activeTab === 'completed') return filteredTasks;
    return [];
  }, [filteredTasks, activeTab]);

  const handleToggleComplete = async (task) => {
    const nextCompleted = !task.is_completed;

    // Optimistic state update
    setAllTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, is_completed: nextCompleted } : t))
    );
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, is_completed: nextCompleted } : t))
    );

    try {
      if (nextCompleted) {
        const { error } = await taskService.completeTask(task.id);
        if (error) {
          showAlert('Error', error.message || 'Could not complete task.');
          setReloadTrigger((p) => p + 1);
          return;
        }
        await rewardService.awardTaskCompletion(task.id, task.title);
      } else {
        const { error } = await taskService.undoCompleteTask(task.id);
        if (error) {
          showAlert('Error', error.message || 'Could not undo task.');
          setReloadTrigger((p) => p + 1);
          return;
        }
      }
      setReloadTrigger((p) => p + 1);
    } catch {
      setReloadTrigger((p) => p + 1);
    }
  };

  const handleDeleteTask = (task) => {
    const confirmDelete = async () => {
      try {
        const { success, error } = await taskService.deleteTask(task.id);
        if (!success || error) {
          showAlert('Error', error?.message || 'Failed to delete task.');
          return;
        }
        setReloadTrigger((prev) => prev + 1);
      } catch (err) {
        showAlert('Error', err instanceof Error ? err.message : 'Delete failed.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Delete Task',
        `Are you sure you want to delete "${task.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  const handleOpenCreateModal = () => {
    setEditingTask(null);
    setModalVisible(true);
  };

  const handleOpenEditModal = (task) => {
    setEditingTask(task);
    setModalVisible(true);
  };

  const handleSaveTask = async (payload) => {
    if (editingTask?.id) {
      const { error } = await taskService.updateTask(editingTask.id, payload);
      if (error) {
        showAlert('Save Failed', error.message);
        return { success: false, error };
      }
    } else {
      const { error } = await taskService.createTask(payload);
      if (error) {
        showAlert('Creation Failed', error.message);
        return { success: false, error };
      }
    }
    setReloadTrigger((prev) => prev + 1);
    return { success: true };
  };

  return (
    <ScreenContainer
      scrollable
      style={{ paddingBottom: 100 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={theme.primary}
          colors={[theme.primary]}
        />
      }
    >
      {/* 1. Header: "Your tasks" + Subtitle + Circular "+" button */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
            Your tasks
          </ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Small steps. Big progress.
          </ThemedText>
        </View>

        <Pressable
          onPress={handleOpenCreateModal}
          accessibilityLabel="Add new task"
          style={({ pressed }) => [
            styles.createCircleBtn,
            { backgroundColor: theme.primary },
            pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] },
          ]}
        >
          <ThemedText style={styles.createBtnPlus}>+</ThemedText>
        </Pressable>
      </View>

      {/* 2. 3 Stat Counter Cards: To do, Completed, Overdue */}
      <View style={styles.statsRow}>
        <ThemedCard variant="outlined" style={styles.statCard}>
          <ThemedText style={[styles.statValue, { color: theme.text }]}>
            {String(toDoCount).padStart(2, '0')}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
            To do
          </ThemedText>
        </ThemedCard>

        <ThemedCard variant="outlined" style={styles.statCard}>
          <ThemedText style={[styles.statValue, { color: theme.text }]}>
            {String(completedCount).padStart(2, '0')}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
            Completed
          </ThemedText>
        </ThemedCard>

        <ThemedCard variant="outlined" style={styles.statCard}>
          <ThemedText
            style={[
              styles.statValue,
              { color: overdueCount > 0 ? (theme.isDark ? '#FF7A29' : '#EA580C') : theme.text },
            ]}
          >
            {String(overdueCount).padStart(2, '0')}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
            Overdue
          </ThemedText>
        </ThemedCard>
      </View>

      {/* 3. Filter Chips: All tasks, Today, Upcoming */}
      <View style={styles.filterChipsRow}>
        <Pressable
          onPress={() => setActiveTab('all')}
          style={[
            styles.filterChipPill,
            activeTab === 'all'
              ? { backgroundColor: theme.primary, borderColor: theme.primary }
              : {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
          ]}
        >
          <ThemedText
            style={[
              styles.filterChipText,
              { color: activeTab === 'all' ? '#FFFFFF' : theme.textSecondary },
            ]}
          >
            All tasks
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('today')}
          style={[
            styles.filterChipPill,
            activeTab === 'today'
              ? { backgroundColor: theme.primary, borderColor: theme.primary }
              : {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
          ]}
        >
          <ThemedText
            style={[
              styles.filterChipText,
              { color: activeTab === 'today' ? '#FFFFFF' : theme.textSecondary },
            ]}
          >
            Today
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('upcoming')}
          style={[
            styles.filterChipPill,
            activeTab === 'upcoming'
              ? { backgroundColor: theme.primary, borderColor: theme.primary }
              : {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
          ]}
        >
          <ThemedText
            style={[
              styles.filterChipText,
              { color: activeTab === 'upcoming' ? '#FFFFFF' : theme.textSecondary },
            ]}
          >
            Upcoming
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('completed')}
          style={[
            styles.filterChipPill,
            activeTab === 'completed'
              ? { backgroundColor: theme.primary, borderColor: theme.primary }
              : {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
          ]}
        >
          <ThemedText
            style={[
              styles.filterChipText,
              { color: activeTab === 'completed' ? '#FFFFFF' : theme.textSecondary },
            ]}
          >
            Done ({completedCount})
          </ThemedText>
        </Pressable>
      </View>

      {/* Loading state */}
      {isLoading && !isRefreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading tasks...
          </ThemedText>
        </View>
      )}

      {/* 4. Grouped Task Sections */}
      {!isLoading && (
        <>
          {/* Section: Today */}
          {todayGroup.length > 0 && (
            <View style={styles.taskGroupSection}>
              <ThemedText style={[styles.groupHeading, { color: theme.text }]}>
                Today · {getTodayFormattedShort()}
              </ThemedText>

              <ThemedCard variant="outlined" style={styles.groupCardContainer}>
                <View style={{ gap: Spacing.xs }}>
                  {todayGroup.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleComplete={handleToggleComplete}
                      onEdit={handleOpenEditModal}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </View>
              </ThemedCard>
            </View>
          )}

          {/* Section: Upcoming */}
          {upcomingGroup.length > 0 && (
            <View style={styles.taskGroupSection}>
              <ThemedText style={[styles.groupHeading, { color: theme.text }]}>
                Upcoming
              </ThemedText>

              <ThemedCard variant="outlined" style={styles.groupCardContainer}>
                <View style={{ gap: Spacing.xs }}>
                  {upcomingGroup.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleComplete={handleToggleComplete}
                      onEdit={handleOpenEditModal}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </View>
              </ThemedCard>
            </View>
          )}

          {/* Section: Completed */}
          {completedGroup.length > 0 && (
            <View style={styles.taskGroupSection}>
              <ThemedText style={[styles.groupHeading, { color: theme.text }]}>
                Completed Tasks
              </ThemedText>

              <ThemedCard variant="outlined" style={styles.groupCardContainer}>
                <View style={{ gap: Spacing.xs }}>
                  {completedGroup.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleComplete={handleToggleComplete}
                      onEdit={handleOpenEditModal}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </View>
              </ThemedCard>
            </View>
          )}

          {/* Empty State */}
          {todayGroup.length === 0 && upcomingGroup.length === 0 && completedGroup.length === 0 && (
            <EmptyState
              iconName={activeTab === 'completed' ? 'check' : 'tasks'}
              title={activeTab === 'completed' ? 'No Completed Tasks' : 'All Clear!'}
              description={
                activeTab === 'completed'
                  ? 'Completed tasks will be saved here for your study records.'
                  : 'You have no pending tasks in this view. Keep your momentum going.'
              }
              action={
                activeTab !== 'completed' ? (
                  <ThemedButton
                    title="+ Add New Task"
                    variant="primary"
                    size="sm"
                    onPress={handleOpenCreateModal}
                  />
                ) : undefined
              }
            />
          )}
        </>
      )}

      {/* Create / Edit Task Modal */}
      <TaskFormModal
        visible={modalVisible}
        task={editingTask}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveTask}
      />

      {/* Profile Modal */}
      <ProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        onProfileUpdated={(p) => {
          if (p) setProfile(p);
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // 1. Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  headerLeft: {
    gap: 3,
  },
  headerTitle: {
    fontSize: Typography.h1.fontSize,
    lineHeight: Typography.h1.lineHeight,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  createCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  createBtnPlus: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginTop: -2,
  },

  // 2. 3 Stat Counter Cards
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

  // 3. Filter Chips
  filterChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.md,
    flexWrap: 'wrap',
  },
  filterChipPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: Borders.thin,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // 4. Task Groups
  taskGroupSection: {
    marginTop: Spacing.lg,
  },
  groupHeading: {
    fontSize: Typography.h2.fontSize,
    lineHeight: Typography.h2.lineHeight,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: Spacing.xs,
  },
  groupCardContainer: {
    borderRadius: Radius.card,
    padding: Spacing.sm,
    borderWidth: Borders.thin,
  },

  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.sm,
    fontSize: 12,
  },
});
