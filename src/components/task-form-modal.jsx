/**
 * Mova Task Form Modal Component
 *
 * Provides an accessible, production-grade modal interface to create and edit tasks.
 * Includes interactive selectors for priority, category, recurrence,
 * calendar due date presets, optional due time, and estimated duration.
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
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_RECURRENCES,
  validateTaskInput,
} from '@/utils/task-validators';

const CATEGORY_META = {
  academic: { label: 'Academic', dot: '#E87532' },
  personal: { label: 'Personal', dot: '#2563EB' },
  work: { label: 'Work', dot: '#7C3AED' },
  health: { label: 'Health', dot: '#27866A' },
  other: { label: 'General', dot: '#89847D' },
};

const PRIORITY_META = {
  urgent: { label: 'Urgent', color: '#DC2626' },
  high: { label: 'High', color: '#EA580C' },
  medium: { label: 'Medium', color: '#D97706' },
  low: { label: 'Low', color: '#64748B' },
};

const RECURRENCE_META = {
  none: 'None',
  daily: 'Daily',
  weekdays: 'Weekdays',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

function getIsoDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function TaskFormContent({ task, onClose, onSave }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const isEditing = Boolean(task?.id);

  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState(task?.priority || 'medium');
  const [category, setCategory] = useState(task?.category || 'academic');
  const [dueDate, setDueDate] = useState(
    task ? task.due_date || '' : getIsoDate(0)
  );
  const [dueTime, setDueTime] = useState(task?.due_time || '');
  const [estimatedDuration, setEstimatedDuration] = useState(
    typeof task?.estimated_duration === 'number' ? String(task.estimated_duration) : ''
  );
  const [recurrence, setRecurrence] = useState(task?.recurrence || 'none');
  const recurrenceInterval =
    typeof task?.recurrence_interval === 'number' ? String(task.recurrence_interval) : '1';

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const rawPayload = {
      title,
      description: description.trim() ? description : null,
      priority,
      category,
      due_date: dueDate.trim() ? dueDate : null,
      due_time: dueTime.trim() ? dueTime : null,
      estimated_duration: estimatedDuration.trim() ? Number(estimatedDuration) : null,
      recurrence,
      recurrence_interval: recurrenceInterval.trim() ? Number(recurrenceInterval) : 1,
    };

    // Client-side validation using established validators
    const validation = validateTaskInput(rawPayload);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setServerError(null);
    setIsSubmitting(true);

    try {
      const result = await onSave?.({
        ...validation.sanitizedData,
        recurrence_interval: rawPayload.recurrence_interval,
      });

      if (result === true || (result && result.success)) {
        onClose?.();
      } else if (result && result.error) {
        setServerError(result.error.message || String(result.error));
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to save task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[
        styles.backdrop,
        { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.72)' : 'rgba(31,27,22,0.44)' },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close task form modal"
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
          {/* Modal Header */}
          <View style={styles.headerRow}>
            <ThemedText type="h3">
              {isEditing ? 'Edit Task' : 'New Task'}
            </ThemedText>
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

          {/* Error Banner */}
          {(Object.keys(errors).length > 0 || serverError) && (
            <View
              style={[
                styles.errorBanner,
                { backgroundColor: theme.isDark ? '#450A0A' : '#FEE2E2', borderColor: theme.error },
              ]}>
              <ThemedText type="caption" style={{ color: theme.error, fontWeight: '700' }}>
                Please correct the highlighted issues:
              </ThemedText>
              {serverError && (
                <ThemedText type="caption" style={{ color: theme.error, fontWeight: '600' }}>
                  • {serverError}
                </ThemedText>
              )}
              {Object.entries(errors).map(([field, msg]) => (
                <ThemedText key={field} type="caption" style={{ color: theme.error }}>
                  • {msg}
                </ThemedText>
              ))}
            </View>
          )}

          {/* Title Input */}
          <ThemedTextInput
            label="Task Title *"
            placeholder="e.g. Finish Calculus Problem Set"
            value={title}
            onChangeText={(val) => {
              setTitle(val);
              if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
            }}
            error={errors.title}
            maxLength={200}
          />

          {/* Description Input */}
          <ThemedTextInput
            label="Description (Optional)"
            placeholder="Add notes, requirements, or study links..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            inputStyle={styles.multilineInput}
            error={errors.description}
            maxLength={2000}
          />

          {/* Category Selector */}
          <ThemedText type="label" themeColor="textSecondary" style={styles.fieldLabel}>
            Category
          </ThemedText>
          <View style={styles.pillsRow}>
            {TASK_CATEGORIES.map((catKey) => {
              const meta = CATEGORY_META[catKey] || { label: catKey, dot: '#64748B' };
              const isSelected = category === catKey;
              return (
                <Pressable
                  key={catKey}
                  accessibilityRole="button"
                  onPress={() => setCategory(catKey)}
                  style={({ pressed }) => [
                    styles.pill,
                    {
                      backgroundColor: isSelected ? theme.primarySubtle : theme.surface,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                    pressed && { opacity: 0.8 },
                  ]}>
                  <View style={[styles.pillDot, { backgroundColor: meta.dot }]} />
                  <ThemedText
                    type="caption"
                    style={{
                      color: isSelected ? theme.primary : theme.textSecondary,
                      fontWeight: isSelected ? '700' : '500',
                    }}>
                    {meta.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {/* Priority Selector */}
          <ThemedText type="label" themeColor="textSecondary" style={styles.fieldLabel}>
            Priority
          </ThemedText>
          <View style={styles.pillsRow}>
            {TASK_PRIORITIES.map((prioKey) => {
              const meta = PRIORITY_META[prioKey];
              const isSelected = priority === prioKey;
              return (
                <Pressable
                  key={prioKey}
                  accessibilityRole="button"
                  onPress={() => setPriority(prioKey)}
                  style={({ pressed }) => [
                    styles.pill,
                    {
                      backgroundColor: isSelected ? theme.primarySubtle : theme.surface,
                      borderColor: isSelected ? meta.color : theme.border,
                    },
                    pressed && { opacity: 0.8 },
                  ]}>
                  <ThemedText
                    type="caption"
                    style={{
                      color: isSelected ? meta.color : theme.textSecondary,
                      fontWeight: isSelected ? '700' : '500',
                    }}>
                    {meta.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {/* Due Date & Presets */}
          <ThemedTextInput
            label="Due Date (YYYY-MM-DD)"
            placeholder="e.g. 2026-10-28"
            value={dueDate}
            onChangeText={(val) => {
              setDueDate(val);
              if (errors.due_date) setErrors((prev) => ({ ...prev, due_date: undefined }));
            }}
            error={errors.due_date}
            maxLength={10}
          />

          {/* Quick Date Presets */}
          <View style={styles.presetsRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setDueDate(getIsoDate(0))}
              style={[styles.presetBtn, { borderColor: theme.border }]}>
              <ThemedText type="caption" themeColor="textSecondary">
                Today
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setDueDate(getIsoDate(1))}
              style={[styles.presetBtn, { borderColor: theme.border }]}>
              <ThemedText type="caption" themeColor="textSecondary">
                Tomorrow
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setDueDate(getIsoDate(7))}
              style={[styles.presetBtn, { borderColor: theme.border }]}>
              <ThemedText type="caption" themeColor="textSecondary">
                +1 Week
              </ThemedText>
            </Pressable>
            {Boolean(dueDate) && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setDueDate('')}
                style={[styles.presetBtn, { borderColor: theme.border }]}>
                <ThemedText type="caption" style={{ color: theme.error }}>
                  Clear
                </ThemedText>
              </Pressable>
            )}
          </View>

          {/* Due Time & Estimated Duration Row */}
          <View style={styles.twoColumnRow}>
            <View style={styles.columnItem}>
              <ThemedTextInput
                label="Due Time (HH:MM)"
                placeholder="e.g. 14:30"
                value={dueTime}
                onChangeText={(val) => {
                  setDueTime(val);
                  if (errors.due_time) setErrors((prev) => ({ ...prev, due_time: undefined }));
                }}
                error={errors.due_time}
                maxLength={5}
              />
            </View>

            <View style={styles.columnItem}>
              <ThemedTextInput
                label="Est. Duration (min)"
                placeholder="e.g. 45"
                value={estimatedDuration}
                onChangeText={(val) => {
                  setEstimatedDuration(val);
                  if (errors.estimated_duration) {
                    setErrors((prev) => ({ ...prev, estimated_duration: undefined }));
                  }
                }}
                keyboardType="numeric"
                error={errors.estimated_duration}
                maxLength={4}
              />
            </View>
          </View>

          {/* Recurrence Selector */}
          <ThemedText type="label" themeColor="textSecondary" style={styles.fieldLabel}>
            Recurrence
          </ThemedText>
          <View style={styles.pillsRow}>
            {TASK_RECURRENCES.map((recKey) => {
              const label = RECURRENCE_META[recKey] || recKey;
              const isSelected = recurrence === recKey;
              return (
                <Pressable
                  key={recKey}
                  accessibilityRole="button"
                  onPress={() => setRecurrence(recKey)}
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
                    {label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {/* Action Buttons */}
          <View style={styles.modalActions}>
            <ThemedButton
              title="Cancel"
              variant="outline"
              onPress={onClose}
              disabled={isSubmitting}
              style={styles.actionBtn}
            />
            <ThemedButton
              title={isEditing ? 'Save Changes' : 'Create Task'}
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

export function TaskFormModal({
  visible,
  task = null,
  onClose,
  onSave,
}) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <TaskFormContent
        key={task?.id ?? 'new-task'}
        task={task}
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
  },
  multilineInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  fieldLabel: {
    marginBottom: 6,
    marginTop: 4,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  pill: {
    minHeight: 36,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: Borders.thin,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: -4,
    marginBottom: Spacing.sm,
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
  twoColumnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  columnItem: {
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionBtn: {
    flex: 1,
  },
});
