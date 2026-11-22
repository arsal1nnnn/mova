/**
 * Mova Campus — Weekly Task Productivity Chart
 *
 * Lightweight, hardware-accelerated bar chart rendering 7-day task completion.
 * Fully responsive across mobile viewports (360-430px) and desktop.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedCard } from '@/components/themed-card';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Borders, Radius, Spacing } from '@/theme';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeeklyTaskChart({ tasks = [], style }) {
  const theme = useTheme();

  // Compute tasks completed in each of the last 7 days
  const today = new Date();
  const todayDay = (today.getDay() + 6) % 7; // 0 = Mon, 6 = Sun

  const counts = [0, 0, 0, 0, 0, 0, 0];
  let totalCompletedThisWeek = 0;

  // Calculate day counts
  (tasks || []).forEach((t) => {
    if (t.is_completed && t.completed_at) {
      const d = new Date(t.completed_at);
      const diffDays = Math.floor((today - d) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        const dayIdx = (d.getDay() + 6) % 7;
        counts[dayIdx] = (counts[dayIdx] || 0) + 1;
        totalCompletedThisWeek += 1;
      }
    }
  });

  const maxCount = Math.max(...counts, 4);

  return (
    <ThemedCard variant="outlined" style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <View>
          <ThemedText type="overline" themeColor="textMuted">
            Weekly Productivity
          </ThemedText>
          <ThemedText type="h3" style={{ fontWeight: '700' }}>
            {totalCompletedThisWeek} {totalCompletedThisWeek === 1 ? 'Task' : 'Tasks'} Completed
          </ThemedText>
        </View>
        <View style={[styles.badge, { backgroundColor: theme.primarySubtle }]}>
          <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700' }}>
            Last 7 Days
          </ThemedText>
        </View>
      </View>

      <View style={styles.chartArea}>
        {DAY_LABELS.map((day, idx) => {
          const count = counts[idx] || 0;
          const barHeightPct = Math.max(8, (count / maxCount) * 100);
          const isToday = idx === todayDay;

          return (
            <View key={day} style={styles.barColumn}>
              <ThemedText type="caption" style={[styles.countText, isToday && { fontWeight: '700', color: theme.primary }]}>
                {count > 0 ? count : ''}
              </ThemedText>

              <View style={[styles.barTrack, { backgroundColor: theme.disabled }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${barHeightPct}%`,
                      backgroundColor: isToday ? theme.primary : count > 0 ? theme.primaryHover : 'transparent',
                    },
                  ]}
                />
              </View>

              <ThemedText
                type="caption"
                style={[
                  styles.dayLabel,
                  { color: isToday ? theme.primary : theme.textSecondary },
                  isToday && { fontWeight: '700' },
                ]}
              >
                {day}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </ThemedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  chartArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: Spacing.sm,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  countText: {
    fontSize: 10,
    marginBottom: 4,
    minHeight: 14,
  },
  barTrack: {
    width: 14,
    height: 75,
    borderRadius: Radius.full,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: Radius.full,
  },
  dayLabel: {
    fontSize: 11,
    marginTop: 6,
  },
});
