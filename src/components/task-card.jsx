/**
 * Mova Task Item Card Component
 *
 * Matches Figma "Mova / Task Item" component specification:
 * - Circular checkbox (21x21, radius 11px)
 * - 13px semi-bold title (#24211F / #F5F3F0)
 * - 10px regular subtitle (#8B8179 / #A5A8B3) with category/duration info
 * - Pill time badge (#FFF0E4 / #39271F with #EA580C / #FF7A29 11px semi-bold text)
 * - Accessible completion toggle, edit and delete actions
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MovaIcon } from '@/components/mova-icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Borders, Radius, Spacing } from '@/theme';

const CATEGORY_NAMES = {
  academic: 'Study',
  personal: 'Personal',
  work: 'Project',
  health: 'Wellness',
  other: 'General',
};

function formatTimeChip(dueTime, dueDate) {
  if (dueTime) {
    // If dueTime is HH:MM or HH:MM:SS, display HH:MM
    return dueTime.slice(0, 5);
  }
  if (dueDate) {
    const today = new Date().toISOString().slice(0, 10);
    if (dueDate === today) return 'Today';
    return dueDate.slice(5); // MM-DD
  }
  return null;
}

export function TaskCard({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
  style,
}) {
  const theme = useTheme();

  if (!task) return null;

  const isCompleted = Boolean(task.is_completed);
  const timeChip = formatTimeChip(task.due_time, task.due_date);

  // Subtitle: e.g. "Study · 35 min" or "Mova project · 45 min"
  const catName = CATEGORY_NAMES[task.category] || (task.category ? task.category.charAt(0).toUpperCase() + task.category.slice(1) : 'Task');
  const durText = task.estimated_duration ? `${task.estimated_duration} min` : null;
  const subtitle = [catName, durText].filter(Boolean).join(' · ');

  return (
    <View
      style={[
        styles.container,
        isCompleted && styles.completedContainer,
        style,
      ]}>
      {/* 21x21 Checkbox */}
      <Pressable
        hitSlop={8}
        onPress={() => onToggleComplete?.(task)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isCompleted }}
        accessibilityLabel={`Mark "${task.title}" as ${isCompleted ? 'incomplete' : 'complete'}`}
        style={({ pressed }) => [
          styles.checkbox,
          {
            borderColor: isCompleted ? theme.primary : theme.borderStrong,
            backgroundColor: isCompleted ? theme.primary : 'transparent',
          },
          pressed && { opacity: 0.8 },
        ]}>
        {isCompleted && (
          <ThemedText style={styles.checkGlyph}>✓</ThemedText>
        )}
      </Pressable>

      {/* Task Details Clickable Slot */}
      <Pressable
        onPress={() => onEdit?.(task)}
        accessibilityRole="button"
        accessibilityLabel={`Task: ${task.title}`}
        style={({ pressed }) => [
          styles.detailsRowPressable,
          pressed && styles.pressed,
        ]}>
        <View style={styles.detailsCol}>
          <ThemedText
            type="taskTitle"
            style={[
              styles.title,
              { color: isCompleted ? theme.textMuted : theme.text },
              isCompleted && styles.completedText,
            ]}
            numberOfLines={1}>
            {task.title}
          </ThemedText>
          <ThemedText
            type="taskSubtitle"
            style={[styles.subtitle, { color: theme.textSecondary }]}
            numberOfLines={1}>
            {subtitle || 'Task'}
          </ThemedText>
        </View>

        {/* Time Chip */}
        {timeChip ? (
          <View
            style={[
              styles.timeChip,
              {
                backgroundColor: isCompleted ? theme.disabled : theme.primarySubtle,
              },
            ]}>
            <ThemedText
              type="chip"
              style={[
                styles.timeChipText,
                { color: isCompleted ? theme.textMuted : theme.primary },
              ]}>
              {timeChip}
            </ThemedText>
          </View>
        ) : null}
      </Pressable>

      {/* Quick Action Button */}
      {onDelete && (
        <Pressable
          hitSlop={8}
          onPress={() => onDelete(task)}
          accessibilityRole="button"
          accessibilityLabel="Delete task"
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}>
          <MovaIcon name="x" size={13} color={theme.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    gap: 10,
    width: '100%',
  },
  detailsRowPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.9,
  },
  completedContainer: {
    opacity: 0.6,
  },
  checkbox: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkGlyph: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  detailsCol: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  subtitle: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '400',
  },
  timeChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeChipText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 4,
    marginLeft: 2,
  },
});
