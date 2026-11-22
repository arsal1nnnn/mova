/**
 * Mova Class Card Component
 *
 * Renders a single recurring class slot with a timeline rail,
 * subject/title details, clean room badge with MovaIcon, duration badge,
 * scheduling status (ongoing / up next / ended), and edit/delete actions.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { MovaIcon } from '@/components/mova-icon';
import { ThemedButton } from '@/components/themed-button';
import { ThemedCard } from '@/components/themed-card';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Borders, Radius, Spacing } from '@/theme';
import {
  formatClassDuration,
  formatTime12h,
  getClassStatus,
  getWeekdayLabel,
} from '@/utils/timetable-validators';

export function ClassCard({
  classSlot,
  onEdit,
  onDelete,
  isNext = false,
  showWeekday = false,
  now = new Date(),
  style,
}) {
  const theme = useTheme();

  if (!classSlot) return null;

  const status = getClassStatus(classSlot, now);
  const isOngoing = status === 'ongoing';
  const durationLabel = formatClassDuration(classSlot);

  const getStatusMeta = () => {
    if (isOngoing) {
      return {
        label: 'In progress',
        bg: theme.successBackground,
        text: theme.success,
        border: theme.success,
        dot: theme.success,
      };
    }
    if (isNext) {
      return {
        label: 'Up next',
        bg: theme.primarySubtle,
        text: theme.primary,
        border: theme.borderFocus,
        dot: theme.primary,
      };
    }
    if (status === 'ended') {
      return {
        label: 'Ended',
        bg: theme.surface,
        text: theme.textMuted,
        border: theme.border,
        dot: theme.textMuted,
      };
    }
    return null;
  };

  const statusMeta = getStatusMeta();

  return (
    <ThemedCard
      variant="outlined"
      style={[
        styles.card,
        isOngoing && { borderColor: theme.success },
        isNext && !isOngoing && { borderColor: theme.borderFocus },
        style,
      ]}>
      <View style={styles.row}>
        {/* Time rail */}
        <View
          style={[
            styles.timeRail,
            {
              backgroundColor: isOngoing
                ? theme.successBackground
                : isNext
                ? theme.primarySubtle
                : theme.surface,
              borderColor: isOngoing
                ? theme.success
                : isNext
                ? theme.borderFocus
                : theme.border,
            },
          ]}>
          <ThemedText
            type="bodySmallStrong"
            style={{
              color: isOngoing
                ? theme.success
                : isNext
                ? theme.primary
                : theme.text,
              fontSize: 12,
            }}>
            {formatTime12h(classSlot.start_time)}
          </ThemedText>
          <View style={[styles.timeRailLine, { backgroundColor: theme.borderStrong }]} />
          <ThemedText type="caption" themeColor="textMuted" style={{ fontSize: 11 }}>
            {formatTime12h(classSlot.end_time)}
          </ThemedText>
        </View>

        {/* Details Body */}
        <View style={styles.body}>
          <View style={styles.badgeRow}>
            {showWeekday && (
              <View style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <ThemedText type="caption" style={[styles.chipText, { color: theme.textSecondary }]}>
                  {getWeekdayLabel(classSlot.weekday)}
                </ThemedText>
              </View>
            )}
            {Boolean(classSlot.room) && (
              <View style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <MovaIcon name="map-pin" size={11} color={theme.textMuted} />
                <ThemedText type="caption" style={[styles.chipText, { color: theme.textSecondary }]}>
                  {classSlot.room}
                </ThemedText>
              </View>
            )}
            {durationLabel ? (
              <View style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <MovaIcon name="clock" size={11} color={theme.textMuted} />
                <ThemedText type="caption" style={[styles.chipText, { color: theme.textSecondary }]}>
                  {durationLabel}
                </ThemedText>
              </View>
            ) : null}
            {statusMeta && (
              <View
                style={[
                  styles.chip,
                  { backgroundColor: statusMeta.bg, borderColor: statusMeta.border },
                ]}>
                <View style={[styles.statusDot, { backgroundColor: statusMeta.dot }]} />
                <ThemedText
                  type="caption"
                  style={[styles.chipText, { color: statusMeta.text, fontWeight: '700' }]}>
                  {statusMeta.label}
                </ThemedText>
              </View>
            )}
          </View>

          <ThemedText type="bodyStrong" style={styles.subject} numberOfLines={2}>
            {classSlot.subject_name}
          </ThemedText>

          <ThemedText type="bodySmall" themeColor="textSecondary" numberOfLines={1}>
            {classSlot.title}
          </ThemedText>

          {(onEdit || onDelete) && (
            <View style={styles.actions}>
              {onEdit && (
                <ThemedButton
                  title="Edit"
                  variant="ghost"
                  size="sm"
                  onPress={() => onEdit(classSlot)}
                  accessibilityLabel={`Edit ${classSlot.subject_name}`}
                  style={styles.actionButton}
                />
              )}
              {onDelete && (
                <ThemedButton
                  title="Delete"
                  variant="ghost"
                  size="sm"
                  onPress={() => onDelete(classSlot)}
                  accessibilityLabel={`Delete ${classSlot.subject_name}`}
                  textStyle={{ color: theme.error }}
                  style={styles.actionButton}
                />
              )}
            </View>
          )}
        </View>
      </View>
    </ThemedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
    borderRadius: Radius.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.sm,
  },
  timeRail: {
    width: 82,
    paddingVertical: Spacing.xs,
    paddingHorizontal: 4,
    borderRadius: Radius.md,
    borderWidth: Borders.thin,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  timeRailLine: {
    width: 12,
    height: 1,
    marginVertical: 1,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: Borders.thin,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
  },
  chipText: {
    fontSize: 11,
  },
  subject: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 2,
    marginTop: Spacing.xxs,
  },
  actionButton: {
    paddingVertical: 0,
    paddingHorizontal: 6,
    minHeight: 28,
  },
});
