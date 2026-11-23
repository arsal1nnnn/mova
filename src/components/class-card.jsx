/**
 * Mova Class Card Component
 *
 * Matches Figma 03 · Timetable schedule row design:
 * - Left time rail: 48px width (11px bold start time, 9px duration)
 * - 3px vertical timeline marker (rounded 4px) with subject accent color
 * - Pastel tinted card container (rounded 20px, px 15 py 14)
 * - 12px semi-bold subject name, 10px subtitle (Type · Room)
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MovaIcon } from '@/components/mova-icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme';
import { formatClassDuration, formatTime12h } from '@/utils/timetable-validators';

// Palette mapping for subject cards matching Figma
const SUBJECT_PALETTES = [
  {
    bgLight: '#EAE4F7', // Soft Lavender
    markerLight: '#75649B',
    subTextLight: '#75649B',
    bgDark: '#373044',
    markerDark: '#D8C7F4',
    subTextDark: '#D8C7F4',
  },
  {
    bgLight: '#DDE8D8', // Muted Sage
    markerLight: '#536B50',
    subTextLight: '#536B50',
    bgDark: '#1E281F',
    markerDark: '#9FC09A',
    subTextDark: '#9FC09A',
  },
  {
    bgLight: '#FFF0E4', // Warm Peach
    markerLight: '#EA580C',
    subTextLight: '#EA580C',
    bgDark: '#30251F',
    markerDark: '#FF7A29',
    subTextDark: '#FF7A29',
  },
  {
    bgLight: '#E2E8F0', // Cool Slate
    markerLight: '#475569',
    subTextLight: '#475569',
    bgDark: '#1E293B',
    markerDark: '#94A3B8',
    subTextDark: '#94A3B8',
  },
];

function getSubjectPalette(subjectName, isDark) {
  if (!subjectName) return SUBJECT_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < subjectName.length; i++) {
    hash = (hash + subjectName.charCodeAt(i)) % SUBJECT_PALETTES.length;
  }
  const item = SUBJECT_PALETTES[hash];
  return {
    bg: isDark ? item.bgDark : item.bgLight,
    marker: isDark ? item.markerDark : item.markerLight,
    subText: isDark ? item.subTextDark : item.subTextLight,
  };
}

export function ClassCard({
  classSlot,
  onEdit,
  onDelete,
  style,
}) {
  const theme = useTheme();

  if (!classSlot) return null;

  const startTimeStr = classSlot.start_time ? classSlot.start_time.slice(0, 5) : '09:00';
  const durationLabel = formatClassDuration(classSlot) || '50 min';
  const palette = getSubjectPalette(classSlot.subject_name, theme.isDark);

  const roomText = classSlot.room ? `Room ${classSlot.room}` : null;
  const titleText = classSlot.title || 'Lecture';
  const subtitle = [titleText, roomText].filter(Boolean).join(' · ');

  return (
    <View
      style={[
        styles.container,
        style,
      ]}>
      {/* Left Time Rail */}
      <View style={styles.timeRail}>
        <ThemedText type="captionStrong" style={styles.startTime}>
          {startTimeStr}
        </ThemedText>
        <ThemedText type="caption" style={[styles.duration, { color: theme.textSecondary }]}>
          {durationLabel}
        </ThemedText>
      </View>

      {/* Vertical Timeline Marker */}
      <View style={[styles.timelineMarker, { backgroundColor: palette.marker }]} />

      {/* Class Details Card */}
      <View style={[styles.detailsCard, { backgroundColor: palette.bg }]}>
        <Pressable
          onPress={() => onEdit?.(classSlot)}
          accessibilityRole="button"
          accessibilityLabel={`Class: ${classSlot.subject_name}`}
          style={({ pressed }) => [styles.copyColPressable, pressed && styles.pressed]}>
          <ThemedText
            type="bodySmallStrong"
            style={[styles.subjectName, { color: theme.text }]}
            numberOfLines={1}>
            {classSlot.subject_name}
          </ThemedText>
          <ThemedText
            type="caption"
            style={[styles.subtitle, { color: palette.subText }]}
            numberOfLines={1}>
            {subtitle}
          </ThemedText>
        </Pressable>

        {onDelete && (
          <Pressable
            hitSlop={8}
            onPress={() => onDelete(classSlot)}
            accessibilityRole="button"
            accessibilityLabel="Delete class"
            style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}>
            <MovaIcon name="x" size={13} color={palette.subText} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginVertical: 4,
  },
  copyColPressable: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.92,
  },
  timeRail: {
    width: 48,
    alignItems: 'flex-start',
    gap: 3,
  },
  startTime: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '700',
  },
  duration: {
    fontSize: 9,
    lineHeight: 11,
  },
  timelineMarker: {
    width: 3,
    height: 58,
    borderRadius: 4,
  },
  detailsCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: Radius.card, // Figma 20px
    minHeight: 64,
  },
  copyCol: {
    flex: 1,
    gap: 4,
  },
  subjectName: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 10,
    lineHeight: 12,
  },
  deleteBtn: {
    padding: 4,
    marginLeft: 6,
  },
});
