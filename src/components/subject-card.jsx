/**
 * Mova Campus — Subject Attendance Card Component
 *
 * Displays a subject with rich attendance visualization:
 * - Current attendance % and status chip
 * - Visual progress bar with dynamic target threshold line
 * - Statistics deck: Total, Attended, Missed, Margin
 * - Actionable bunk calculation and recovery advice
 * - Tactile quick-mark Present / Absent buttons
 * - History and subject management actions
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MovaIcon } from '@/components/mova-icon';
import { ThemedButton } from '@/components/themed-button';
import { ThemedCard } from '@/components/themed-card';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Borders, Radius, Spacing } from '@/theme';
import {
  formatAttendancePercentage,
  getAttendanceStatusLabel,
} from '@/utils/attendance-validators';

function getStatusColors(theme, status) {
  switch (status) {
    case 'on_track':
      return {
        bg: theme.successBackground,
        text: theme.success,
        border: theme.success,
        dot: theme.success,
      };
    case 'at_risk':
      return {
        bg: theme.warningBackground,
        text: theme.warning,
        border: theme.warning,
        dot: theme.warning,
      };
    case 'below_target':
      return {
        bg: theme.errorBackground,
        text: theme.error,
        border: theme.error,
        dot: theme.error,
      };
    default:
      return {
        bg: theme.surface,
        text: theme.textMuted,
        border: theme.border,
        dot: theme.textMuted,
      };
  }
}

export function SubjectCard({
  subject,
  onMarkPresent,
  onMarkAbsent,
  onViewHistory,
  onEdit,
  onDelete,
  style,
}) {
  const theme = useTheme();

  if (!subject) return null;

  const summary = subject.summary || {
    totalClasses: 0,
    attendedClasses: 0,
    missedClasses: 0,
    percentage: 0,
    status: 'no_data',
    safeBunks: 0,
    classesToRecover: 0,
  };

  const statusColors = getStatusColors(theme, summary.status);
  const statusLabel = getAttendanceStatusLabel(summary.status);
  const targetPct = subject.target_percentage || 75;
  const currentPct = Math.min(100, Math.max(0, summary.percentage || 0));

  return (
    <ThemedCard variant="outlined" style={[styles.card, style]}>
      {/* Header: Subject Name + Percentage */}
      <View style={styles.headerRow}>
        <View style={styles.nameCol}>
          <ThemedText type="bodyStrong" numberOfLines={2} style={styles.subjectName}>
            {subject.name}
          </ThemedText>
          <ThemedText type="caption" themeColor="textMuted">
            Target: {targetPct}%
          </ThemedText>
        </View>

        <View style={styles.percentageCol}>
          <ThemedText
            type="progressNumber"
            style={{
              color: summary.status === 'no_data' || summary.totalClasses === 0 ? theme.textMuted : statusColors.text,
            }}>
            {formatAttendancePercentage(summary.percentage, summary.totalClasses)}
          </ThemedText>
          <View
            style={[
              styles.statusChip,
              { backgroundColor: statusColors.bg, borderColor: statusColors.border },
            ]}>
            <View style={[styles.statusDot, { backgroundColor: statusColors.dot }]} />
            <ThemedText
              type="caption"
              style={[styles.chipText, { color: statusColors.text, fontWeight: '700' }]}>
              {statusLabel}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Visual Progress Bar with Target Marker */}
      {summary.totalClasses > 0 && (
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarTrack, { backgroundColor: theme.surface }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${currentPct}%`,
                  backgroundColor: statusColors.dot,
                },
              ]}
            />
            {/* Target threshold marker */}
            <View
              style={[
                styles.targetMarker,
                {
                  left: `${targetPct}%`,
                  backgroundColor: theme.text,
                },
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
            <ThemedText type="caption" themeColor="textMuted" style={{ fontSize: 10 }}>
              0%
            </ThemedText>
            <ThemedText type="caption" themeColor="textMuted" style={{ fontSize: 10 }}>
              Target {targetPct}%
            </ThemedText>
            <ThemedText type="caption" themeColor="textMuted" style={{ fontSize: 10 }}>
              100%
            </ThemedText>
          </View>
        </View>
      )}

      {/* Detailed Stats Deck */}
      {summary.totalClasses > 0 && (
        <View style={[styles.statsRow, { borderColor: theme.divider }]}>
          <View style={styles.statItem}>
            <ThemedText type="caption" themeColor="textMuted">Total</ThemedText>
            <ThemedText type="bodySmallStrong">{summary.totalClasses}</ThemedText>
          </View>
          <View style={[styles.statItem, styles.statBorder, { borderColor: theme.divider }]}>
            <ThemedText type="caption" themeColor="textMuted">Attended</ThemedText>
            <ThemedText type="bodySmallStrong" style={{ color: theme.success }}>
              {summary.attendedClasses}
            </ThemedText>
          </View>
          <View style={[styles.statItem, styles.statBorder, { borderColor: theme.divider }]}>
            <ThemedText type="caption" themeColor="textMuted">Missed</ThemedText>
            <ThemedText type="bodySmallStrong" style={{ color: theme.error }}>
              {summary.missedClasses}
            </ThemedText>
          </View>
          <View style={[styles.statItem, styles.statBorder, { borderColor: theme.divider }]}>
            <ThemedText type="caption" themeColor="textMuted">
              {summary.safeBunks > 0 ? 'Safe Bunks' : 'Need Classes'}
            </ThemedText>
            <ThemedText
              type="bodySmallStrong"
              style={{
                color:
                  summary.safeBunks > 0
                    ? theme.success
                    : summary.classesToRecover > 0
                    ? theme.warning
                    : theme.textMuted,
              }}>
              {summary.safeBunks > 0
                ? `+${summary.safeBunks}`
                : summary.classesToRecover > 0
                ? summary.classesToRecover
                : '0'}
            </ThemedText>
          </View>
        </View>
      )}

      {/* Actionable Recovery Advice Banner */}
      {summary.totalClasses > 0 && (
        <View
          style={[
            styles.adviceBanner,
            {
              backgroundColor: statusColors.bg,
              borderColor: statusColors.border,
            },
          ]}>
          <MovaIcon
            name={summary.safeBunks > 0 ? 'check' : summary.classesToRecover > 0 ? 'alert' : 'target'}
            size={14}
            color={statusColors.text}
          />
          <ThemedText
            type="caption"
            style={[styles.adviceText, { color: statusColors.text, fontWeight: '600' }]}>
            {summary.safeBunks > 0
              ? `Safe to miss next ${summary.safeBunks} class${summary.safeBunks !== 1 ? 'es' : ''} while maintaining ≥${targetPct}%.`
              : summary.classesToRecover > 0
              ? `Attend next ${summary.classesToRecover} consecutive class${summary.classesToRecover !== 1 ? 'es' : ''} to reach ${targetPct}%.`
              : `Exactly on target (${targetPct}%). Do not miss the next lecture.`}
          </ThemedText>
        </View>
      )}

      {/* Zero Classes Helpful Explanation */}
      {summary.totalClasses === 0 && (
        <View
          style={[
            styles.adviceBanner,
            {
              backgroundColor: theme.primarySubtle,
              borderColor: theme.border,
            },
          ]}>
          <MovaIcon name="sparkle" size={14} color={theme.primary} />
          <ThemedText
            type="caption"
            style={[styles.adviceText, { color: theme.textSecondary, fontWeight: '500' }]}>
            No attendance records yet. Mark today&apos;s lecture below or enter an initial baseline in Edit.
          </ThemedText>
        </View>
      )}

      {/* Quick Action Buttons */}
      <View style={styles.quickActions}>
        <ThemedButton
          title="Present"
          variant="primary"
          size="sm"
          onPress={() => onMarkPresent?.(subject)}
          leftIcon={<MovaIcon name="check" size={13} color={theme.primaryText} strokeWidth={2.5} />}
          style={styles.markBtn}
        />
        <ThemedButton
          title="Absent"
          variant="outline"
          size="sm"
          onPress={() => onMarkAbsent?.(subject)}
          leftIcon={<MovaIcon name="x" size={13} color={theme.primary} strokeWidth={2.2} />}
          style={styles.markBtn}
        />

        <View style={styles.moreActions}>
          {onViewHistory && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View history for ${subject.name}`}
              hitSlop={8}
              onPress={() => onViewHistory(subject)}
              style={({ pressed }) => [styles.actionLink, pressed && { opacity: 0.6 }]}>
              <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700' }}>
                History
              </ThemedText>
            </Pressable>
          )}
          {onEdit && (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => onEdit(subject)}
              style={({ pressed }) => [styles.actionLink, pressed && { opacity: 0.6 }]}>
              <ThemedText type="caption" themeColor="textSecondary">
                Edit
              </ThemedText>
            </Pressable>
          )}
          {onDelete && (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => onDelete(subject)}
              style={({ pressed }) => [styles.actionLink, pressed && { opacity: 0.6 }]}>
              <ThemedText type="caption" style={{ color: theme.error }}>
                Delete
              </ThemedText>
            </Pressable>
          )}
        </View>
      </View>
    </ThemedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  nameCol: {
    flex: 1,
    gap: 2,
  },
  subjectName: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  percentageCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: Borders.thin,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
  },
  chipText: {
    fontSize: 11,
  },
  progressBarContainer: {
    gap: 3,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: Radius.full,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  targetMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    opacity: 0.7,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: Borders.thin,
    borderBottomWidth: Borders.thin,
    paddingVertical: Spacing.xs,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statBorder: {
    borderLeftWidth: Borders.thin,
  },
  adviceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: Radius.md,
    borderWidth: Borders.thin,
  },
  adviceText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  markBtn: {
    minWidth: 92,
  },
  moreActions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    alignItems: 'center',
  },
  actionLink: {
    paddingVertical: 4,
  },
});
