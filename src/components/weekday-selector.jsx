/**
 * Mova Weekday Selector
 *
 * Matches Figma 03 · Timetable "Week strip":
 * - 7 vertical day pills (43px width, 58px height, rounded 13px)
 * - Top: Single-letter day name ("M", "T", "W", "T", "F", "S", "S") (10px semi-bold)
 * - Bottom: Numeric day of month (14px bold)
 * - Active pill: Mova Orange (#EA580C / #FF7A29) with white text
 * - Inactive pills: Card surface (#FFFFFF / #1A202E) with slate day letter and charcoal date
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme';
import { WEEKDAYS } from '@/utils/timetable-validators';

// Helper to calculate the calendar date for each weekday in the current week (Monday-first)
function getDatesForCurrentWeek() {
  const now = new Date();
  const currentDayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
  // Calculate Monday offset: Sunday (0) -> -6, Monday (1) -> 0, Tuesday (2) -> -1 ...
  const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + distanceToMonday);

  const dates = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    // Weekday values in our schema: 1 (Mon) .. 6 (Sat), 0 (Sun)
    const val = i === 6 ? 0 : i + 1;
    dates[val] = d.getDate();
  }
  return dates;
}

export function WeekdaySelector({
  selectedWeekday,
  onSelect,
  counts = {},
  todayWeekday,
  style,
}) {
  const theme = useTheme();
  const weekDates = React.useMemo(() => getDatesForCurrentWeek(), []);

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="tablist"
      accessibilityLabel="Choose a weekday">
      {WEEKDAYS.map((day) => {
        const isSelected = selectedWeekday === day.value;
        const isToday = todayWeekday === day.value;
        const dayNumber = weekDates[day.value] ?? (day.value === 0 ? 7 : day.value);

        return (
          <Pressable
            key={day.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${day.label}${isToday ? ', today' : ''}`}
            onPress={() => onSelect?.(day.value)}
            style={({ pressed }) => [
              styles.dayCell,
              {
                backgroundColor: isSelected ? theme.primary : theme.surface,
              },
              pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
            ]}>
            <ThemedText
              style={[
                styles.dayLetter,
                {
                  color: isSelected ? '#FFFFFF' : theme.textSecondary,
                },
              ]}>
              {day.short.charAt(0)}
            </ThemedText>

            <ThemedText
              style={[
                styles.dateNumber,
                {
                  color: isSelected ? '#FFFFFF' : theme.text,
                },
              ]}>
              {dayNumber}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 5,
  },
  dayCell: {
    flex: 1,
    height: 58,
    borderRadius: Radius.dayPill, // Figma 13px
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dayLetter: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
  dateNumber: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
  },
});
