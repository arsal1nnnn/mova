/**
 * Mova Weekday Selector
 *
 * Horizontal, Monday-first weekday navigation for the timetable screen.
 * Shows day abbreviation, today indicator dot, and class count badge.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Borders, Radius, Spacing } from '@/theme';
import { WEEKDAYS } from '@/utils/timetable-validators';

export function WeekdaySelector({
  selectedWeekday,
  onSelect,
  counts = {},
  todayWeekday,
  style,
}) {
  const theme = useTheme();

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="tablist"
      accessibilityLabel="Choose a weekday">
      {WEEKDAYS.map((day) => {
        const isSelected = selectedWeekday === day.value;
        const isToday = todayWeekday === day.value;
        const count = counts[day.value] ?? 0;

        return (
          <Pressable
            key={day.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${day.label}${isToday ? ', today' : ''}, ${count} ${
              count === 1 ? 'class' : 'classes'
            }`}
            onPress={() => onSelect?.(day.value)}
            style={({ pressed }) => [
              styles.dayCell,
              {
                backgroundColor: isSelected ? theme.primary : theme.surface,
                borderColor: isSelected
                  ? theme.primary
                  : isToday
                  ? theme.borderFocus
                  : theme.border,
              },
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}>
            <ThemedText
              type="caption"
              style={[
                styles.dayLabel,
                {
                  color: isSelected ? theme.primaryText : theme.textSecondary,
                  fontWeight: isSelected || isToday ? '700' : '500',
                },
              ]}>
              {day.short}
            </ThemedText>

            <View
              style={[
                styles.countBadge,
                {
                  backgroundColor: isSelected ? theme.primaryPressed : theme.background,
                  borderColor: isSelected ? theme.primaryPressed : theme.border,
                },
              ]}>
              <ThemedText
                type="caption"
                style={[
                  styles.countText,
                  { color: isSelected ? theme.primaryText : theme.textMuted },
                ]}>
                {count}
              </ThemedText>
            </View>

            {isToday && (
              <View
                style={[
                  styles.todayIndicator,
                  { backgroundColor: isSelected ? theme.primaryText : theme.primary },
                ]}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
  },
  dayCell: {
    flex: 1,
    minWidth: 36,
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderRadius: Radius.md,
    borderWidth: Borders.thin,
    alignItems: 'center',
    gap: 5,
  },
  dayLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  countBadge: {
    minWidth: 20,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: Radius.full,
    borderWidth: Borders.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
  },
  todayIndicator: {
    width: 4,
    height: 4,
    borderRadius: Radius.full,
    marginTop: 1,
  },
});
