/**
 * Mova Dedicated Task Management Screen
 *
 * Full-featured student task workspace:
 * - Search and multi-criteria filtering (status, category, priority)
 * - Task creation and editing with form validation modal
 * - Interactive completion toggle with automated recurrence generation
 * - Deletion and undo completion
 * - Loading, empty, and honest unconfigured states
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import {
  EmptyState,
  MetricStrip,
  PageHeader,
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
import { Radius, Spacing } from '@/theme';

export default function TasksScreen() {
  const theme = useTheme();
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isUnconfigured, setIsUnconfigured] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState(null);

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Counts for quick metrics
  const [metrics, setMetrics] = useState({ total: 0, pending: 0, completed: 0 });

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
        const { tasks: taskData, error } = await taskService.getTasks({
          status: statusFilter,
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

        // Fetch counts for metrics strip
        const { tasks: allUserTasks } = await taskService.getTasks({ status: 'all' });
        if (isMounted && allUserTasks) {
          const completedCount = allUserTasks.filter((t) => t.is_completed).length;
          setMetrics({
            total: allUserTasks.length,
            pending: allUserTasks.length - completedCount,
            completed: completedCount,
          });
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
  }, [statusFilter, categoryFilter, priorityFilter, searchQuery, reloadTrigger]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setReloadTrigger((prev) => prev + 1);
  };

  const handleToggleComplete = async (task) => {
    try {
      if (task.is_completed) {
        const { error } = await taskService.undoCompleteTask(task.id);
        if (error) {
          showAlert('Error', error.message || 'Could not undo task completion.');
          return;
        }
      } else {
        const { error } = await taskService.completeTask(task.id);
        if (error) {
          showAlert('Error', error.message || 'Could not complete task.');
          return;
        }
        await rewardService.awardTaskCompletion(task.id, task.title);
      }
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      showAlert('Error', err instanceof Error ? err.message : 'Action failed.');
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

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCategoryFilter(null);
    setPriorityFilter(null);
  };

  return (
    <ScreenContainer
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={theme.primary}
          colors={[theme.primary]}
        />
      }>
      {/* Page Header */}
      <PageHeader
        title="Tasks & Deadlines"
        subtitle="Assignments, study blocks, and reminders"
        userProfile={profile}
        onAvatarPress={() => setProfileModalVisible(true)}
        action={
          <ThemedButton
            title="+ New Task"
            variant="primary"
            size="sm"
            onPress={handleOpenCreateModal}
          />
        }
      />

      {/* Metrics Summary Strip */}
      <MetricStrip
        style={{ marginBottom: Spacing.xs }}
        items={[
          { label: 'Pending', value: metrics.pending, tone: metrics.pending > 0 ? 'primary' : 'success' },
          { label: 'Completed', value: metrics.completed, tone: 'success' },
          { label: 'Total', value: metrics.total },
        ]}
      />

      {/* Task Completion Progress Bar */}
      {metrics.total > 0 && (
        <ThemedCard variant="flat" style={styles.progressCard}>
          <View style={styles.progressHeaderRow}>
            <ThemedText type="caption" themeColor="textSecondary">
              Completion Rate
            </ThemedText>
            <ThemedText type="caption" style={{ fontWeight: '700', color: theme.primary }}>
              {Math.round((metrics.completed / metrics.total) * 100)}% ({metrics.completed}/{metrics.total} completed)
            </ThemedText>
          </View>
          <View style={[styles.progressBarTrack, { backgroundColor: 'rgba(0,0,0,0.06)' }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: theme.primary,
                  width: `${Math.round((metrics.completed / metrics.total) * 100)}%`,
                },
              ]}
            />
          </View>
        </ThemedCard>
      )}

      {/* Filter and Search Bar */}
      <TaskFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        onClearFilters={handleClearFilters}
      />

      {/* Unconfigured Remote Supabase Notice */}
      {isUnconfigured && (
        <ThemedCard
          variant="outlined"
          style={[styles.noticeCard, { borderColor: theme.warning }]}>
          <ThemedText type="bodyStrong" style={{ color: theme.warning, marginBottom: 4 }}>
            Supabase not configured
          </ThemedText>
          <ThemedText type="bodySmall" themeColor="textSecondary">
            Task persistence requires EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.
          </ThemedText>
        </ThemedCard>
      )}

      {/* Error State */}
      {errorMessage && !isUnconfigured && (
        <ThemedCard variant="outlined" style={[styles.noticeCard, { borderColor: theme.error }]}>
          <ThemedText type="bodyStrong" style={{ color: theme.error, marginBottom: 4 }}>
            Failed to Load Tasks
          </ThemedText>
          <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginBottom: Spacing.sm }}>
            {errorMessage}
          </ThemedText>
          <ThemedButton
            title="Retry"
            variant="outline"
            size="sm"
            onPress={() => setReloadTrigger((prev) => prev + 1)}
          />
        </ThemedCard>
      )}

      {/* Loading Indicator */}
      {isLoading && !isRefreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText type="caption" themeColor="textMuted" style={{ marginTop: Spacing.sm }}>
            Loading tasks...
          </ThemedText>
        </View>
      )}

      {/* Task Cards List */}
      {!isLoading && !errorMessage && !isUnconfigured && tasks.length > 0 && (
        <View style={styles.tasksList}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleComplete={handleToggleComplete}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteTask}
            />
          ))}
        </View>
      )}

      {/* Empty State */}
      {!isLoading && !errorMessage && !isUnconfigured && tasks.length === 0 && (
        <EmptyState
          iconName={statusFilter === 'completed' ? 'check' : 'tasks'}
          title={
            statusFilter === 'completed'
              ? 'No Completed Tasks'
              : searchQuery || categoryFilter || priorityFilter
              ? 'No Matching Tasks'
              : 'No Tasks Yet'
          }
          description={
            statusFilter === 'completed'
              ? 'Completed tasks will be archived here.'
              : searchQuery || categoryFilter || priorityFilter
              ? 'No tasks match your active filters. Try adjusting your search query or reset filters.'
              : 'Add homework, project milestones, and exam study blocks to organize your days.'
          }
          action={
            statusFilter !== 'completed' ? (
              <ThemedButton
                title="+ Add First Task"
                variant="primary"
                size="sm"
                onPress={handleOpenCreateModal}
              />
            ) : undefined
          }
        />
      )}

      {/* Create / Edit Task Modal */}
      <TaskFormModal
        visible={modalVisible}
        task={editingTask}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveTask}
      />

      {/* Profile & Settings Modal */}
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
  progressCard: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: Spacing.xs,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  tasksList: {
    gap: Spacing.xs,
  },
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeCard: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
});
