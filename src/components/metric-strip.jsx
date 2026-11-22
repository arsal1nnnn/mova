/**
 * Mova Metric Strip
 *
 * Compact, unified metric dashboard strip for Tasks, Timetable, and Attendance.
 * A single bordered surface with subtle dividers replaces disconnected floating cards.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedCard } from '@/components/themed-card';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Borders, Radius, Spacing } from '@/theme';

export function MetricStrip({ items = [], style }) {
  const theme = useTheme();

  return (
    <ThemedCard variant="outlined" padding="none" style={[styles.card, style]}>
      <View style={styles.row}>
        {items.map((item, index) => (
          <View
            key={item.label}
            style={[
              styles.item,
              index > 0 && {
                borderLeftWidth: Borders.thin,
                borderLeftColor: theme.divider,
              },
            ]}>
            <ThemedText type="overline" themeColor="textMuted" style={styles.label}>
              {item.label}
            </ThemedText>
            <ThemedText
              type={item.size || 'progressNumber'}
              numberOfLines={1}
              style={[
                styles.value,
                { color: item.tone ? theme[item.tone] : theme.text },
              ]}>
              {item.value}
            </ThemedText>
          </View>
        ))}
      </View>
    </ThemedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    gap: 3,
  },
  label: {
    letterSpacing: 0.8,
    fontSize: 10,
  },
  value: {
    textAlign: 'center',
  },
});
