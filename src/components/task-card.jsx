/**
 * Mova Task Item Card Component
 *
 * Refined, editorial task item card with:
 * - Tactile completion checkbox
 * - Cohesive priority indicator and category pills (no cheap emojis)
 * - Due date and overdue highlighting with MovaIcon
 * - Estimated duration and recurrence badge
 * - Smooth completion states
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MovaIcon } from '@/components/mova-icon';
import { ThemedButton } from '@/components/themed-button';
import { ThemedCard } from '@/components/themed-card';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Borders, Radius, Spacing } from '@/theme';

const CATEGORY_LABELS = {
  academic: 'Academic',
  personal: 'Personal',
  work: 'Work',
  health: 'Health',
  other: 'General',
};

const CATEGORY_DOT_COLORS = {
  academic: '#E87532', // Warm accent
  personal: '#2563EB', // Blue
  work: '#7C3AED',     // Purple
  health: '#27866A',   // Forest green
  other: '#89847D',    // Slate
};

const RECURRENCE_LABELS = {
  daily: 'Daily',
  weekdays: 'Weekdays',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

function formatDueDate(dueDate, dueTime) {
  if (!dueDate) return null;

  try {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().slice(0, 10);

    let dateText = dueDate;
    if (dueDate === today) {
      dateText = 'Today';
    } else if (dueDate === tomorrow) {
      dateText = 'Tomorrow';
    } else {
      const [year, month, day] = dueDate.split('-').map(Number);
      const parsedDate = new Date(year, month - 1, day);
      dateText = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(parsedDate);
    }

    if (dueTime) {
      return `${dateText}, ${dueTime}`;
    }
    return dateText;
  } catch {
    return dueDate;
  }
}

function isOverdue(dueDate, dueTime, isCompleted) {
  if (!dueDate || isCompleted) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (dueDate < today) return true;
  if (dueDate === today && dueTime) {
    const currentHours = String(new Date().getHours()).padStart(2, '0');
    const currentMinutes = String(new Date().getMinutes()).padStart(2, '0');
    const currentTime = `${currentHours}:${currentMinutes}`;
    return dueTime < currentTime;
  }
  return false;
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
  const overdue = isOverdue(task.due_date, task.due_time, isCompleted);
  const formattedDue = formatDueDate(task.due_date, task.due_time);

  // Priority color mappings
  const getPriorityColors = () => {
    switch (task.priority) {
      case 'urgent':
        return {
          bg: theme.isDark ? '#3D0E0E' : '#FEE2E2',
          text: theme.isDark ? '#FCA5A5' : '#B91C1C',
          border: theme.isDark ? '#5C1414' : '#FCA5A5',
          label: 'Urgent',
          dot: '#DC2626',
        };
      case 'high':
        return {
          bg: theme.isDark ? '#381A08' : '#FFEDD5',
          text: theme.isDark ? '#FDBA74' : '#C2410C',
          border: theme.isDark ? '#5C280C' : '#FDBA74',
          label: 'High',
          dot: '#EA580C',
        };
      case 'medium':
        return {
          bg: theme.isDark ? '#361E08' : '#FEF3C7',
          text: theme.isDark ? '#FCD34D' : '#B45309',
          border: theme.isDark ? '#542E0C' : '#FCD34D',
          label: 'Medium',
          dot: '#D97706',
        };
      case 'low':
      default:
        return {
          bg: theme.surface,
          text: theme.textSecondary,
          border: theme.border,
          label: 'Low',
          dot: '#94A3B8',
        };
    }
  };

  const priorityMeta = getPriorityColors();
  const categoryLabel = CATEGORY_LABELS[task.category] || 'General';
  const categoryDotColor = CATEGORY_DOT_COLORS[task.category] || '#64748B';
  const recurrenceLabel = RECURRENCE_LABELS[task.recurrence] || null;

  return (
    <ThemedCard
      variant="outlined"
      style={[
        styles.card,
        isCompleted && styles.completedCard,
        overdue && !isCompleted && { borderColor: theme.error },
        style,
      ]}>
      <View style={styles.contentRow}>
        {/* Tactile Completion Checkbox */}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isCompleted }}
          accessibilityLabel={`Mark task "${task.title}" as ${isCompleted ? 'incomplete' : 'complete'}`}
          hitSlop={8}
          onPress={() => onToggleComplete?.(task)}
          style={({ pressed }) => [
            styles.checkbox,
            {
              borderColor: isCompleted ? theme.primary : theme.borderStrong,
              backgroundColor: isCompleted ? theme.primary : 'transparent',
            },
            pressed && { transform: [{ scale: 0.94 }], opacity: 0.8 },
          ]}>
          {isCompleted && (
            <MovaIcon name="check" size={13} color={theme.primaryText} strokeWidth={2.6} />
          )}
        </Pressable>

        {/* Task Details */}
        <View style={styles.bodyColumn}>
          {/* Header row: Category & Priority Badges */}
          <View style={styles.badgeRow}>
            {/* Category Chip */}
            <View
              style={[
                styles.chip,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}>
              <View style={[styles.dotIndicator, { backgroundColor: categoryDotColor }]} />
              <ThemedText type="caption" style={[styles.chipText, { color: theme.textSecondary }]}>
                {categoryLabel}
              </ThemedText>
            </View>

            {/* Priority Badge */}
            {task.priority !== 'low' && (
              <View
                style={[
                  styles.chip,
                  {
                    backgroundColor: priorityMeta.bg,
                    borderColor: priorityMeta.border,
                  },
                ]}>
                <View style={[styles.dotIndicator, { backgroundColor: priorityMeta.dot }]} />
                <ThemedText
                  type="caption"
                  style={[styles.chipText, { color: priorityMeta.text, fontWeight: '700' }]}>
                  {priorityMeta.label}
                </ThemedText>
              </View>
            )}

            {/* Recurrence Badge */}
            {recurrenceLabel && (
              <View
                style={[
                  styles.chip,
                  { backgroundColor: theme.primarySubtle, borderColor: theme.borderFocus },
                ]}>
                <ThemedText type="caption" style={[styles.chipText, { color: theme.primary, fontWeight: '600' }]}>
                  ↻ {recurrenceLabel}
                </ThemedText>
              </View>
            )}

            {/* Estimated Duration */}
            {typeof task.estimated_duration === 'number' && task.estimated_duration > 0 && (
              <View
                style={[
                  styles.chip,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}>
                <MovaIcon name="clock" size={11} color={theme.textMuted} />
                <ThemedText type="caption" style={[styles.chipText, { color: theme.textSecondary }]}>
                  {task.estimated_duration}m
                </ThemedText>
              </View>
            )}
          </View>

          {/* Title */}
          <ThemedText
            type="bodyStrong"
            style={[
              styles.title,
              isCompleted && [styles.completedText, { color: theme.textMuted }],
            ]}
            numberOfLines={2}>
            {task.title}
          </ThemedText>

          {/* Description */}
          {Boolean(task.description) && (
            <ThemedText
              type="bodySmall"
              themeColor="textSecondary"
              style={[styles.description, isCompleted && { color: theme.textMuted }]}
              numberOfLines={2}>
              {task.description}
            </ThemedText>
          )}

          {/* Footer: Due date info & Action buttons */}
          <View style={styles.footerRow}>
            {formattedDue ? (
              <View style={styles.dueContainer}>
                <MovaIcon
                  name={overdue ? 'alert' : 'calendar'}
                  size={12}
                  color={overdue ? theme.error : theme.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <ThemedText
                  type="caption"
                  style={[
                    styles.dueText,
                    { color: overdue ? theme.error : theme.textSecondary },
                  ]}>
                  {overdue ? `Overdue (${formattedDue})` : formattedDue}
                </ThemedText>
              </View>
            ) : (
              <ThemedText type="caption" themeColor="textMuted">
                No deadline
              </ThemedText>
            )}

            <View style={styles.actionButtonGroup}>
              {onEdit && (
                <ThemedButton
                  title="Edit"
                  variant="ghost"
                  size="sm"
                  onPress={() => onEdit(task)}
                  style={styles.actionButton}
                />
              )}
              {onDelete && (
                <ThemedButton
                  title="Delete"
                  variant="ghost"
                  size="sm"
                  onPress={() => onDelete(task)}
                  textStyle={{ color: theme.error }}
                  style={styles.actionButton}
                />
              )}
            </View>
          </View>
        </View>
      </View>
    </ThemedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radius.lg,
  },
  completedCard: {
    opacity: 0.6,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    borderWidth: 1.75,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginRight: Spacing.sm,
  },
  bodyColumn: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: Borders.thin,
    gap: 4,
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
  },
  chipText: {
    fontSize: 11,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.1,
    marginBottom: 3,
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: 4,
  },
  dueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  dueText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionButton: {
    paddingVertical: 0,
    paddingHorizontal: 6,
    minHeight: 30,
  },
});
