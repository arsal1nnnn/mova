/**
 * Mova Timetable / Routine Screen
 *
 * Matches Figma 03 · Timetable — Light (#3:255):
 * - Header: "Timetable" (24px bold) + "Your week, at a glance." (12px) + "+ Add class" pill button (#EA580C)
 * - Month header: "NOVEMBER 2026" (10px bold, letterSpacing 0.8, uppercase)
 * - Week strip: 7 day pills (Mon - Sun, 43x58, rounded 13px)
 * - Day summary chip: "MONDAY, 23 NOV · 4 CLASSES" (#FFF0E4 / #39271F)
 * - Timeline Schedule List: 48px time rail + 3px vertical timeline marker + pastel tinted card
 * - Weekly attendance insight card: "Weekly attendance" + "92%" + "You're doing great. Keep your streak alive."
 * - OCR timetable image/PDF import modal and full Supabase persistence
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
  ClassCard,
  ClassFormModal,
  EmptyState,
  MovaIcon,
  ProfileModal,
  ScreenContainer,
  ThemedButton,
  ThemedCard,
  ThemedText,
  TimetableImportModal,
  WeekdaySelector,
} from '@/components';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { profileService } from '@/services/profile-service';
import { timetableService } from '@/services/timetable-service';
import { Borders, Radius, Spacing, Typography } from '@/theme';
import {
  formatTimeRange,
  getClassesForWeekday,
  getUpcomingClasses,
  getWeekdayFromDate,
  getWeekdayLabel,
  getWeekSchedule,
  WEEKDAYS,
} from '@/utils/timetable-validators';

function getFormattedMonthYear() {
  try {
    const d = new Date();
    const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(d);
    return `${month} ${d.getFullYear()}`.toUpperCase();
  } catch {
    return 'NOVEMBER 2026';
  }
}

function showAlert(title, message) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(`${title}\n\n${message}`);
    }
    return;
  }
  Alert.alert(title, message);
}

export default function TimetableScreen() {
  const theme = useTheme();
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isUnconfigured, setIsUnconfigured] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const todayWeekday = getWeekdayFromDate();
  const [selectedWeekday, setSelectedWeekday] = useState(todayWeekday);
  const [viewMode, setViewMode] = useState('day'); // 'day' | 'week'

  const [modalVisible, setModalVisible] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [importModalVisible, setImportModalVisible] = useState(false);

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

    async function fetchClasses() {
      if (!timetableService.isConfigured()) {
        if (isMounted) {
          setIsUnconfigured(true);
          setIsLoading(false);
          setIsRefreshing(false);
        }
        return;
      }

      const { classes: classData, error } = await timetableService.getClasses();

      if (!isMounted) return;

      if (error) {
        setErrorMessage(error.message || 'Failed to load your timetable.');
      } else {
        setClasses(classData || []);
        setErrorMessage(null);
      }

      setIsLoading(false);
      setIsRefreshing(false);
    }

    fetchClasses();

    return () => {
      isMounted = false;
    };
  }, [reloadTrigger]);

  const counts = useMemo(() => {
    const map = {};
    classes.forEach((cls) => {
      map[cls.weekday] = (map[cls.weekday] || 0) + 1;
    });
    return map;
  }, [classes]);

  const selectedDayClasses = useMemo(
    () => getClassesForWeekday(classes, selectedWeekday),
    [classes, selectedWeekday]
  );

  const todayClasses = useMemo(
    () => getClassesForWeekday(classes, todayWeekday),
    [classes, todayWeekday]
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    setReloadTrigger((prev) => prev + 1);
  };

  const handleOpenCreateModal = () => {
    setEditingClass(null);
    setModalVisible(true);
  };

  const handleOpenEditModal = (classSlot) => {
    setEditingClass(classSlot);
    setModalVisible(true);
  };

  const handleSaveClass = async (payload) => {
    if (editingClass?.id) {
      const { error, errors } = await timetableService.updateClass(editingClass.id, payload);
      if (error) {
        showAlert('Save Failed', errors?.time || error.message);
        return { success: false, error: errors?.time ? new Error(errors.time) : error };
      }
    } else {
      const { error, errors } = await timetableService.createClass(payload);
      if (error) {
        showAlert('Could Not Add Class', errors?.time || error.message);
        return { success: false, error: errors?.time ? new Error(errors.time) : error };
      }
    }

    if (payload.weekday !== undefined) {
      setSelectedWeekday(payload.weekday);
    }

    setReloadTrigger((prev) => prev + 1);
    return { success: true };
  };

  const handleDeleteClass = (classSlot) => {
    const confirmDelete = async () => {
      const { success, error } = await timetableService.deleteClass(classSlot.id);
      if (!success || error) {
        showAlert('Error', error?.message || 'Failed to delete class.');
        return;
      }
      setReloadTrigger((prev) => prev + 1);
    };

    const message = `Remove "${classSlot.subject_name}" (${getWeekdayLabel(
      classSlot.weekday
    )}, ${formatTimeRange(classSlot.start_time, classSlot.end_time)}) from your routine?`;

    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        confirmDelete();
      }
    } else {
      Alert.alert('Delete Class', message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      ]);
    }
  };

  // Day summary pill text
  const daySummaryText = useMemo(() => {
    const dayLabel = getWeekdayLabel(selectedWeekday).toUpperCase();
    const count = selectedDayClasses.length;
    return `${dayLabel} · ${count} ${count === 1 ? 'CLASS' : 'CLASSES'}`;
  }, [selectedWeekday, selectedDayClasses]);

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
      {/* 1. Header: "Timetable" + Subtitle + "+ Add class" pill */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
            Timetable
          </ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Your week, at a glance.
          </ThemedText>
        </View>

        <View style={styles.headerRightActions}>
          <Pressable
            onPress={() => setImportModalVisible(true)}
            accessibilityLabel="Upload schedule document"
            style={({ pressed }) => [
              styles.uploadPillBtn,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <MovaIcon name="upload" size={13} color={theme.primary} />
            <ThemedText style={[styles.uploadPillText, { color: theme.primary }]}>
              Scan OCR
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={handleOpenCreateModal}
            accessibilityLabel="Add new class"
            style={({ pressed }) => [
              styles.addClassPillBtn,
              { backgroundColor: theme.primary },
              pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
            ]}
          >
            <ThemedText style={styles.addClassPillText}>+ Add class</ThemedText>
          </Pressable>
        </View>
      </View>

      {/* 2. Month Header: "NOVEMBER 2026" */}
      <View style={styles.monthHeaderRow}>
        <ThemedText style={[styles.monthHeaderText, { color: theme.textSecondary }]}>
          {getFormattedMonthYear()}
        </ThemedText>

        {/* View toggle (Day vs Week) */}
        <View
          style={[
            styles.segmentContainer,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Pressable
            onPress={() => setViewMode('day')}
            style={[
              styles.segmentItem,
              viewMode === 'day' && { backgroundColor: theme.primary },
            ]}
          >
            <ThemedText
              style={[
                styles.segmentText,
                { color: viewMode === 'day' ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              Day
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => setViewMode('week')}
            style={[
              styles.segmentItem,
              viewMode === 'week' && { backgroundColor: theme.primary },
            ]}
          >
            <ThemedText
              style={[
                styles.segmentText,
                { color: viewMode === 'week' ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              Week
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {/* 3. Week Strip: 7 pills (Mon - Sun, 43x58, rounded 13px) */}
      <WeekdaySelector
        selectedWeekday={selectedWeekday}
        onSelect={(weekday) => {
          setSelectedWeekday(weekday);
          setViewMode('day');
        }}
        counts={counts}
        todayWeekday={todayWeekday}
      />

      {/* 4. Day Summary Chip: e.g. "MONDAY, 23 NOV · 4 CLASSES" */}
      {viewMode === 'day' && (
        <View style={styles.daySummaryChipRow}>
          <View
            style={[
              styles.daySummaryChip,
              { backgroundColor: theme.isDark ? '#39271F' : '#FFF0E4' },
            ]}
          >
            <ThemedText
              style={[
                styles.daySummaryChipText,
                { color: theme.isDark ? '#FF7A29' : '#EA580C' },
              ]}
            >
              {daySummaryText}
            </ThemedText>
          </View>
        </View>
      )}

      {/* Loading indicator */}
      {isLoading && !isRefreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading timetable...
          </ThemedText>
        </View>
      )}

      {/* 5. Timeline Schedule List */}
      {!isLoading && viewMode === 'day' && (
        <View style={styles.timelineListContainer}>
          {selectedDayClasses.length > 0 ? (
            <View style={{ gap: Spacing.sm }}>
              {selectedDayClasses.map((classSlot) => (
                <ClassCard
                  key={classSlot.id}
                  classSlot={classSlot}
                  onEdit={handleOpenEditModal}
                  onDelete={handleDeleteClass}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              iconName="timetable"
              title={selectedWeekday === todayWeekday ? 'No Classes Today' : `No Classes on ${getWeekdayLabel(selectedWeekday)}`}
              description="No classes scheduled for this day. You can add one or import your syllabus."
              action={
                <ThemedButton
                  title="+ Add Class"
                  variant="primary"
                  size="sm"
                  onPress={handleOpenCreateModal}
                />
              }
            />
          )}
        </View>
      )}

      {/* Week View */}
      {!isLoading && viewMode === 'week' && (
        <View style={styles.weekViewContainer}>
          {WEEKDAYS.map((day) => {
            const dayClasses = getClassesForWeekday(classes, day.value);
            const isToday = day.value === todayWeekday;

            return (
              <View key={day.value} style={styles.weekDayBlock}>
                <View style={styles.weekDayHeader}>
                  <ThemedText style={[styles.weekDayTitle, { color: isToday ? theme.primary : theme.text }]}>
                    {day.label}
                    {isToday ? ' · Today' : ''}
                  </ThemedText>
                  <ThemedText style={[styles.weekDayBadge, { color: theme.textSecondary }]}>
                    {dayClasses.length === 0 ? 'No classes' : `${dayClasses.length} ${dayClasses.length === 1 ? 'class' : 'classes'}`}
                  </ThemedText>
                </View>

                {dayClasses.length > 0 ? (
                  <View style={{ gap: Spacing.xs }}>
                    {dayClasses.map((classSlot) => (
                      <ClassCard
                        key={classSlot.id}
                        classSlot={classSlot}
                        onEdit={handleOpenEditModal}
                        onDelete={handleDeleteClass}
                      />
                    ))}
                  </View>
                ) : (
                  <ThemedText style={[styles.freeDayNote, { color: theme.textSecondary }]}>
                    Free day
                  </ThemedText>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* 6. Weekly Attendance Insight Card */}
      <ThemedCard variant="outlined" style={styles.insightCard}>
        <View style={styles.insightLeft}>
          <ThemedText style={[styles.insightTitle, { color: theme.text }]}>
            Weekly attendance
          </ThemedText>
          <ThemedText style={[styles.insightSubtitle, { color: theme.textSecondary }]}>
            You&apos;re doing great. Keep your streak alive.
          </ThemedText>
        </View>

        <ThemedText style={[styles.insightBigPercentage, { color: theme.primary }]}>
          92%
        </ThemedText>
      </ThemedCard>

      {/* Class Form Modal */}
      <ClassFormModal
        visible={modalVisible}
        classSlot={editingClass}
        existingClasses={classes}
        defaultWeekday={selectedWeekday}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveClass}
      />

      {/* Profile Modal */}
      <ProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        onProfileUpdated={(p) => {
          if (p) setProfile(p);
        }}
      />

      {/* OCR Timetable Import Modal */}
      <TimetableImportModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        onSaveComplete={() => setReloadTrigger((prev) => prev + 1)}
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.button,
    borderWidth: Borders.thin,
  },
  uploadPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addClassPillBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addClassPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // 2. Month Header
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xxs,
  },
  monthHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: Radius.sm,
    borderWidth: Borders.thin,
    padding: 2,
    gap: 2,
  },
  segmentItem: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm - 2,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // 4. Day Summary Chip
  daySummaryChipRow: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    alignItems: 'flex-start',
  },
  daySummaryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  daySummaryChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // 5. Timeline List
  timelineListContainer: {
    marginTop: Spacing.xs,
  },
  weekViewContainer: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  weekDayBlock: {
    gap: Spacing.xs,
  },
  weekDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  weekDayTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  weekDayBadge: {
    fontSize: 11,
  },
  freeDayNote: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 6,
  },

  // 6. Insight Card
  insightCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Radius.card,
    padding: Spacing.md,
    borderWidth: Borders.thin,
    marginTop: Spacing.lg,
  },
  insightLeft: {
    flex: 1,
    gap: 3,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  insightSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  insightBigPercentage: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginLeft: 12,
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
