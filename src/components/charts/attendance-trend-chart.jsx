/**
 * Mova Campus — Subject Attendance Comparison & Trend Chart
 *
 * Visualizes individual subject attendance percentages compared against
 * the configured target line (default 75%).
 * Displays safe bunk allowance (+X bunks) or consecutive recovery needs.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedCard } from '@/components/themed-card';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Borders, Radius, Spacing } from '@/theme';
import { formatAttendancePercentage } from '@/utils/attendance-validators';

export function AttendanceTrendChart({ subjects = [], style }) {
  const theme = useTheme();

  if (!subjects || subjects.length === 0) {
    return null;
  }

  return (
    <ThemedCard variant="outlined" style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <View>
          <ThemedText type="overline" themeColor="textMuted">
            Subject Attendance Health
          </ThemedText>
          <ThemedText type="h3" style={{ fontWeight: '700' }}>
            Target Benchmark (75%)
          </ThemedText>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: theme.success }]} />
          <ThemedText type="caption" color="textSecondary" style={{ marginRight: 8, fontSize: 11 }}>
            Safe
          </ThemedText>
          <View style={[styles.dot, { backgroundColor: theme.error }]} />
          <ThemedText type="caption" color="textSecondary" style={{ fontSize: 11 }}>
            Below
          </ThemedText>
        </View>
      </View>

      <View style={styles.list}>
        {subjects.map((sub) => {
          const summary = sub.summary || {
            percentage: sub.percentage || 0,
            safeBunks: sub.safeBunks || 0,
            classesToRecover: sub.classesToRecover || 0,
            totalClasses: sub.totalClasses || 0,
            attendedClasses: sub.attendedClasses || 0,
          };

          const pct = summary.percentage;
          const target = sub.target_percentage || 75;
          const isSafe = pct >= target;
          const barColor = isSafe ? theme.success : pct >= target - 10 ? theme.warning : theme.error;

          return (
            <View key={sub.id} style={styles.subjectRow}>
              <View style={styles.labelRow}>
                <ThemedText type="bodySmallStrong" style={styles.subjectName} numberOfLines={1}>
                  {sub.name}
                </ThemedText>
                <View style={styles.metaRight}>
                  <ThemedText type="caption" style={{ fontWeight: '700', color: barColor }}>
                    {formatAttendancePercentage(pct)}
                  </ThemedText>
                  <ThemedText type="caption" color="textMuted" style={{ marginLeft: 6 }}>
                    ({summary.attendedClasses}/{summary.totalClasses})
                  </ThemedText>
                </View>
              </View>

              {/* Progress bar with 75% target marker */}
              <View style={[styles.track, { backgroundColor: theme.disabled }]}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.min(100, Math.max(2, pct))}%`,
                      backgroundColor: barColor,
                    },
                  ]}
                />
                {/* 75% Target Marker */}
                <View style={[styles.targetMarker, { left: `${target}%` }]} />
              </View>

              <View style={styles.subFooter}>
                <ThemedText type="caption" color="textSecondary" style={{ fontSize: 11 }}>
                  {isSafe
                    ? summary.safeBunks > 0
                      ? `Can safely miss ${summary.safeBunks} more ${summary.safeBunks === 1 ? 'class' : 'classes'}`
                      : 'At target threshold'
                    : summary.classesToRecover > 0
                    ? `Attend next ${summary.classesToRecover} consecutive ${summary.classesToRecover === 1 ? 'class' : 'classes'} to reach ${target}%`
                    : 'Below target'}
                </ThemedText>
              </View>
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
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: Radius.full,
    marginRight: 4,
  },
  list: {
    gap: Spacing.sm,
  },
  subjectRow: {
    paddingVertical: 2,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  subjectName: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  track: {
    height: 8,
    borderRadius: Radius.full,
    position: 'relative',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  targetMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#1E1E1E',
    zIndex: 2,
  },
  subFooter: {
    marginTop: 3,
  },
});
