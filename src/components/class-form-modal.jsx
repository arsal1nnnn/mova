/**
 * Mova Class Form Modal
 *
 * Accessible create/edit form for recurring weekly timetable slots.
 * Validates subject, title, weekday, start/end times (including range and
 * overlap conflicts) before handing a sanitized payload to the screen.
 */

import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/themed-button';
import { ThemedCard } from '@/components/themed-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { useTheme } from '@/hooks/use-theme';
import { Borders, Radius, Spacing } from '@/theme';
import {
  MIN_CLASS_DURATION_MINUTES,
  validateClassInput,
  WEEKDAYS,
} from '@/utils/timetable-validators';

const DURATION_PRESETS = [
  { label: '45m', minutes: 45 },
  { label: '1h', minutes: 60 },
  { label: '1h 30m', minutes: 90 },
  { label: '2h', minutes: 120 },
];

function addMinutesToTime(time, minutes) {
  const match = /^([01][0-9]|2[0-3]):([0-5][0-9])$/.exec((time || '').trim().slice(0, 5));
  if (!match) return null;

  const total = Number(match[1]) * 60 + Number(match[2]) + minutes;
  if (total < 0 || total >= 24 * 60) return null;

  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function ClassFormContent({ classSlot, existingClasses, defaultWeekday, onClose, onSave }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isEditing = Boolean(classSlot?.id);

  const [subjectName, setSubjectName] = useState(classSlot?.subject_name || '');
  const [title, setTitle] = useState(classSlot?.title || '');
  const [weekday, setWeekday] = useState(
    typeof classSlot?.weekday === 'number' ? classSlot.weekday : defaultWeekday
  );
  const [startTime, setStartTime] = useState(classSlot?.start_time || '09:00');
  const [endTime, setEndTime] = useState(classSlot?.end_time || '10:00');
  const [room, setRoom] = useState(classSlot?.room || '');

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearError = (key) => {
    setErrors((prev) => {
      if (!prev[key] && !prev.time) return prev;
      const next = { ...prev };
      delete next[key];
      delete next.time;
      return next;
    });
  };

  const handleApplyDuration = (minutes) => {
    const nextEnd = addMinutesToTime(startTime, minutes);
    if (nextEnd) {
      setEndTime(nextEnd);
      clearError('end_time');
    }
  };

  const handleSubmit = async () => {
    const cleanSubject = subjectName.trim();
    const payload = {
      subject_name: cleanSubject,
      title: title.trim() ? title.trim() : cleanSubject,
      weekday,
      start_time: startTime,
      end_time: endTime,
      room: room.trim() ? room.trim() : null,
    };

    const validation = validateClassInput(payload, {
      existingClasses,
      excludeId: classSlot?.id ?? null,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setServerError(null);
    setIsSubmitting(true);

    try {
      const result = await onSave?.(validation.sanitizedData);
      if (result === true || (result && result.success)) {
        onClose?.();
      } else if (result && result.error) {
        setServerError(result.error.message || String(result.error));
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to save class.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldError = (key) => (errors[key] ? errors[key] : undefined);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[
        styles.backdrop,
        { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.72)' : 'rgba(31,27,22,0.44)' },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close class form"
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
          <View style={styles.headerRow}>
            <ThemedText type="h3">{isEditing ? 'Edit Class' : 'New Class'}</ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={4}
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.6 }]}>
              <ThemedText type="bodyStrong" style={{ color: theme.textSecondary }}>
                ✕
              </ThemedText>
            </Pressable>
          </View>

          {(Object.keys(errors).length > 0 || serverError) && (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: theme.errorBackground,
                  borderColor: theme.error,
                },
              ]}>
              <ThemedText type="caption" style={{ color: theme.error, fontWeight: '700' }}>
                Please correct the following:
              </ThemedText>
              {serverError && (
                <ThemedText type="caption" style={{ color: theme.error, fontWeight: '600' }}>
                  • {serverError}
                </ThemedText>
              )}
              {Object.entries(errors).map(([field, message]) => (
                <ThemedText key={field} type="caption" style={{ color: theme.error }}>
                  • {message}
                </ThemedText>
              ))}
            </View>
          )}

          <ThemedTextInput
            label="Subject Name *"
            placeholder="e.g. Data Structures"
            value={subjectName}
            onChangeText={(value) => {
              setSubjectName(value);
              clearError('subject_name');
            }}
            error={fieldError('subject_name')}
            maxLength={100}
          />

          <ThemedTextInput
            label="Class Title *"
            placeholder="e.g. Lecture, Lab Batch B, Tutorial"
            value={title}
            onChangeText={(value) => {
              setTitle(value);
              clearError('title');
            }}
            error={fieldError('title')}
            maxLength={120}
          />

          <ThemedTextInput
            label="Room / Location (Optional)"
            placeholder="e.g. Room 204, Block C"
            value={room}
            onChangeText={(value) => {
              setRoom(value);
              clearError('room');
            }}
            error={fieldError('room')}
            maxLength={100}
          />

          {/* Weekday selector */}
          <ThemedText type="label" themeColor="textSecondary" style={styles.fieldLabel}>
            Repeats every
          </ThemedText>
          <View style={styles.pillsRow}>
            {WEEKDAYS.map((day) => {
              const isSelected = weekday === day.value;
              return (
                <Pressable
                  key={day.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={day.label}
                  onPress={() => {
                    setWeekday(day.value);
                    clearError('weekday');
                  }}
                  style={({ pressed }) => [
                    styles.pill,
                    {
                      backgroundColor: isSelected ? theme.primarySubtle : theme.surface,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                    pressed && { opacity: 0.8 },
                  ]}>
                  <ThemedText
                    type="caption"
                    style={{
                      color: isSelected ? theme.primary : theme.textSecondary,
                      fontWeight: isSelected ? '700' : '500',
                    }}>
                    {day.short}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          {errors.weekday && (
            <ThemedText type="caption" color="error">
              {errors.weekday}
            </ThemedText>
          )}

          {/* Time range */}
          <View style={styles.twoColumnRow}>
            <View style={styles.columnItem}>
              <ThemedTextInput
                label="Start Time (HH:MM) *"
                placeholder="09:00"
                value={startTime}
                onChangeText={(value) => {
                  setStartTime(value);
                  clearError('start_time');
                }}
                error={fieldError('start_time')}
                maxLength={5}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={styles.columnItem}>
              <ThemedTextInput
                label="End Time (HH:MM) *"
                placeholder="10:30"
                value={endTime}
                onChangeText={(value) => {
                  setEndTime(value);
                  clearError('end_time');
                }}
                error={fieldError('end_time')}
                maxLength={5}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          <View style={styles.presetsRow}>
            <ThemedText type="caption" themeColor="textMuted" style={styles.presetLabel}>
              Duration:
            </ThemedText>
            {DURATION_PRESETS.map((preset) => (
              <Pressable
                key={preset.label}
                accessibilityRole="button"
                accessibilityLabel={`Set duration to ${preset.label}`}
                onPress={() => handleApplyDuration(preset.minutes)}
                style={({ pressed }) => [
                  styles.presetBtn,
                  { borderColor: theme.border },
                  pressed && { opacity: 0.7 },
                ]}>
                <ThemedText type="caption" themeColor="textSecondary">
                  {preset.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {errors.time && (
            <View
              style={[
                styles.conflictNotice,
                {
                  backgroundColor: theme.warningBackground,
                  borderColor: theme.warning,
                },
              ]}>
              <ThemedText type="caption" style={{ color: theme.warning, fontWeight: '600' }}>
                ⚠️ {errors.time}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Adjust the day or time so two classes do not run at once.
              </ThemedText>
            </View>
          )}

          <ThemedText type="caption" themeColor="textMuted" style={styles.helperText}>
            Times use your device&apos;s local clock and repeat every week. Classes must be at
            least {MIN_CLASS_DURATION_MINUTES} minutes long.
          </ThemedText>

          <View style={styles.modalActions}>
            <ThemedButton
              title="Cancel"
              variant="outline"
              onPress={onClose}
              disabled={isSubmitting}
              style={styles.actionBtn}
            />
            <ThemedButton
              title={isEditing ? 'Save Changes' : 'Add Class'}
              variant="primary"
              loading={isSubmitting}
              onPress={handleSubmit}
              style={styles.actionBtn}
            />
          </View>
        </ScrollView>
      </ThemedCard>
    </KeyboardAvoidingView>
  );
}

export function ClassFormModal({
  visible,
  classSlot = null,
  existingClasses = [],
  defaultWeekday = 1,
  onClose,
  onSave,
}) {
  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <ClassFormContent
        key={classSlot?.id ?? `new-class-${defaultWeekday}`}
        classSlot={classSlot}
        existingClasses={existingClasses}
        defaultWeekday={defaultWeekday}
        onClose={onClose}
        onSave={onSave}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
    paddingBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: Borders.thin,
    marginBottom: Spacing.sm,
    gap: 2,
  },
  fieldLabel: {
    marginBottom: 6,
    marginTop: 4,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  pill: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: Borders.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  columnItem: {
    flex: 1,
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: -4,
    marginBottom: Spacing.sm,
  },
  presetLabel: {
    marginRight: 2,
  },
  presetBtn: {
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: Borders.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conflictNotice: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: Borders.thin,
    gap: 2,
    marginBottom: Spacing.sm,
  },
  helperText: {
    marginBottom: Spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  actionBtn: {
    flex: 1,
  },
});
