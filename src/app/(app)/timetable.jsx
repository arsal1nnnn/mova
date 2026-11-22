/**
 * Mova Timetable / Routine Screen
 *
 * Weekly recurring class schedule interface:
 * - Create, edit and delete class slots with validated time ranges
 * - Monday-first weekday navigation strip with per-day class counts
 * - Day view (chronological) and Week view (all seven days)
 * - Upcoming classes, empty states, and conflict notices
 * - Polished editorial calendar layout
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
  MetricStrip,
  MovaIcon,
  PageHeader,
  ProfileModal,
  ScreenContainer,
  SectionHeader,
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
import { Borders, Radius, Spacing } from '@/theme';
import {
  formatTime12h,
  formatTimeRange,
  getClassesForWeekday,
  getUpcomingClasses,
  getWeekdayFromDate,
  getWeekdayLabel,
  getWeekSchedule,
  WEEKDAYS,
} from '@/utils/timetable-validators';

function showAlert(title, message) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(`${title}\n\n${message}`);
    }
    return;
  }
  Alert.alert(title, message);
}

function shiftWeekday(weekday, delta) {
  const index = WEEKDAYS.findIndex((day) => day.value === weekday);
  const base = index === -1 ? 0 : index;
  const next = (base + delta + WEEKDAYS.length) % WEEKDAYS.length;
  return WEEKDAYS[next].value;
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
  const [viewMode, setViewMode] = useState('day');

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

  const upcoming = useMemo(() => getUpcomingClasses(classes, new Date(), 3), [classes]);

  const weekSchedule = useMemo(
    () => getWeekSchedule(classes).filter((day) => day.classes.length > 0),
    [classes]
  );

  const nextClassId = upcoming[0]?.dayOffset === 0 ? upcoming[0]?.class?.id : null;

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

  const renderEmptyDay = (weekday) => (
    <EmptyState
      iconName="timetable"
      title={weekday === todayWeekday ? 'No Classes Today' : `No Classes on ${getWeekdayLabel(weekday)}`}
      description="Add a lecture, lab, or tutorial and it will repeat on this day every week."
      action={
        <ThemedButton
          title="+ Add Class"
          variant="primary"
          size="sm"
          onPress={handleOpenCreateModal}
        />
      }
    />
  );

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
      <PageHeader
        title="Class Routine"
        subtitle="Weekly recurring timetable"
        userProfile={profile}
        onAvatarPress={() => setProfileModalVisible(true)}
        action={
          <View style={{ flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' }}>
            <ThemedButton
              title="Upload Schedule"
              variant="outline"
              size="sm"
              onPress={() => setImportModalVisible(true)}
              leftIcon={<MovaIcon name="upload" size={14} color={theme.primary} />}
            />
            <ThemedButton
              title="+ Add Class"
              variant="primary"
              size="sm"
              onPress={handleOpenCreateModal}
            />
          </View>
        }
      />

      {/* Weekly metrics */}
      <MetricStrip
        items={[
          { label: 'Today', value: `${todayClasses.length} Classes`, tone: 'primary', size: 'bodySmallStrong' },
          { label: 'Weekly Total', value: `${classes.length} Slots`, size: 'bodySmallStrong' },
          {
            label: 'Next Up',
            value: upcoming[0] ? formatTime12h(upcoming[0].class.start_time) : '—',
            tone: 'success',
            size: 'bodySmallStrong',
          },
        ]}
      />

      {/* Unconfigured notice */}
      {isUnconfigured && (
        <ThemedCard variant="outlined" style={[styles.noticeCard, { borderColor: theme.warning }]}>
          <ThemedText type="bodyStrong" style={{ color: theme.warning, marginBottom: 4 }}>
            Supabase not configured
          </ThemedText>
          <ThemedText type="bodySmall" themeColor="textSecondary">
            Timetable persistence requires EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.
          </ThemedText>
        </ThemedCard>
      )}

      {/* Error state */}
      {errorMessage && !isUnconfigured && (
        <ThemedCard variant="outlined" style={[styles.noticeCard, { borderColor: theme.error }]}>
          <ThemedText type="bodyStrong" style={{ color: theme.error, marginBottom: 4 }}>
            Failed to Load Timetable
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

      {/* Loading */}
      {isLoading && !isRefreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText type="caption" themeColor="textMuted" style={{ marginTop: Spacing.sm }}>
            Loading timetable...
          </ThemedText>
        </View>
      )}

      {!isLoading && !isUnconfigured && !errorMessage && (
        <>
          {/* Weekday navigation strip */}
          <WeekdaySelector
            selectedWeekday={selectedWeekday}
            onSelect={(weekday) => {
              setSelectedWeekday(weekday);
              setViewMode('day');
            }}
            counts={counts}
            todayWeekday={todayWeekday}
          />

          {/* View mode toggle & day navigation */}
          <View style={styles.viewToggleRow}>
            <View
              style={[
                styles.segmentContainer,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}>
              {[
                { key: 'day', label: 'Day View' },
                { key: 'week', label: 'Week View' },
              ].map((option) => {
                const isSelected = viewMode === option.key;
                return (
                  <Pressable
                    key={option.key}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setViewMode(option.key)}
                    style={({ pressed }) => [
                      styles.segmentItem,
                      {
                        backgroundColor: isSelected ? theme.primary : 'transparent',
                      },
                      pressed && { opacity: 0.8 },
                    ]}>
                    <ThemedText
                      type="caption"
                      style={{
                        color: isSelected ? theme.primaryText : theme.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
                      }}>
                      {option.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {viewMode === 'day' && (
              <View style={styles.dayNavRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous day"
                  onPress={() => setSelectedWeekday(shiftWeekday(selectedWeekday, -1))}
                  style={({ pressed }) => [
                    styles.dayNavButton,
                    { borderColor: theme.border, backgroundColor: theme.surface },
                    pressed && { opacity: 0.7 },
                  ]}>
                  <MovaIcon name="chevron-left" size={16} color={theme.primary} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next day"
                  onPress={() => setSelectedWeekday(shiftWeekday(selectedWeekday, 1))}
                  style={({ pressed }) => [
                    styles.dayNavButton,
                    { borderColor: theme.border, backgroundColor: theme.surface },
                    pressed && { opacity: 0.7 },
                  ]}>
                  <MovaIcon name="chevron-right" size={16} color={theme.primary} />
                </Pressable>
              </View>
            )}
          </View>

          {/* Day view */}
          {viewMode === 'day' && (
            <View style={styles.section}>
              <SectionHeader
                title={
                  selectedWeekday === todayWeekday
                    ? `Today · ${getWeekdayLabel(selectedWeekday)}`
                    : getWeekdayLabel(selectedWeekday)
                }
                badge={`${selectedDayClasses.length} ${selectedDayClasses.length === 1 ? 'CLASS' : 'CLASSES'}`}
              />

              {selectedDayClasses.length > 0 ? (
                <View style={styles.cardList}>
                  {selectedDayClasses.map((classSlot) => (
                    <ClassCard
                      key={classSlot.id}
                      classSlot={classSlot}
                      onEdit={handleOpenEditModal}
                      onDelete={handleDeleteClass}
                      isNext={classSlot.id === nextClassId}
                    />
                  ))}
                </View>
              ) : (
                renderEmptyDay(selectedWeekday)
              )}
            </View>
          )}

          {/* Week view */}
          {viewMode === 'week' && (
            <View style={styles.section}>
              <SectionHeader title="Weekly Schedule" />

              {classes.length === 0 ? (
                <EmptyState
                  iconName="timetable"
                  title="Your Routine Is Empty"
                  description="Add your recurring lectures and labs once to construct your full weekly schedule."
                  action={
                    <ThemedButton
                      title="+ Add First Class"
                      variant="primary"
                      size="sm"
                      onPress={handleOpenCreateModal}
                    />
                  }
                />
              ) : (
                WEEKDAYS.map((day) => {
                  const dayClasses = getClassesForWeekday(classes, day.value);
                  const isToday = day.value === todayWeekday;

                  return (
                    <View key={day.value} style={styles.weekDayBlock}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`View ${day.label}`}
                        hitSlop={6}
                        onPress={() => {
                          setSelectedWeekday(day.value);
                          setViewMode('day');
                        }}
                        style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                        <View style={styles.weekDayHeader}>
                          <ThemedText
                            type="bodySmallStrong"
                            style={{ color: isToday ? theme.primary : theme.text }}>
                            {day.label}
                            {isToday ? ' · Today' : ''}
                          </ThemedText>
                          <ThemedText type="caption" themeColor="textMuted">
                            {dayClasses.length === 0
                              ? 'Free day'
                              : `${dayClasses.length} ${dayClasses.length === 1 ? 'class' : 'classes'}`}
                          </ThemedText>
                        </View>
                      </Pressable>

                      {dayClasses.length > 0 ? (
                        dayClasses.map((classSlot) => (
                          <ClassCard
                            key={classSlot.id}
                            classSlot={classSlot}
                            onEdit={handleOpenEditModal}
                            onDelete={handleDeleteClass}
                          />
                        ))
                      ) : (
                        <ThemedText
                          type="caption"
                          themeColor="textMuted"
                          style={styles.freeDayText}>
                          No scheduled classes
                        </ThemedText>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* Up next section */}
          {upcoming.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Up Next in Routine" />
              {upcoming.map((item) => (
                <View key={`${item.class.id}-${item.dayOffset}`}>
                  <ClassCard
                    classSlot={item.class}
                    showWeekday={item.dayOffset > 0}
                    onEdit={handleOpenEditModal}
                    onDelete={handleDeleteClass}
                  />
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Class Form Modal */}
      <ClassFormModal
        visible={modalVisible}
        classSlot={editingClass}
        existingClasses={classes}
        defaultWeekday={selectedWeekday}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveClass}
      />

      {/* Profile & Settings Modal */}
      <ProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        onProfileUpdated={(p) => {
          if (p) setProfile(p);
        }}
      />

      {/* Timetable OCR / Photo Import Modal */}
      <TimetableImportModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        onSaveComplete={() => setReloadTrigger((prev) => prev + 1)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  noticeCard: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  segmentContainer: {
    flexDirection: 'row',
    gap: 2,
    padding: 3,
    borderRadius: Radius.md,
    borderWidth: Borders.thin,
  },
  segmentItem: {
    minHeight: 32,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNavRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  dayNavButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    borderWidth: Borders.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: Spacing.xs,
  },
  cardList: {
    gap: Spacing.xs,
  },
  weekDayBlock: {
    marginBottom: Spacing.sm,
  },
  weekDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xxs,
    marginBottom: Spacing.xxs,
  },
  freeDayText: {
    paddingLeft: Spacing.xxs,
    paddingBottom: Spacing.xs,
  },
});
