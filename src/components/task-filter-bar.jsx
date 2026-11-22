/**
 * Mova Task Filter and Search Bar Component
 *
 * Provides responsive status view filters (All, Pending, Upcoming, Completed),
 * search text input with icon, category pills with refined dot badges,
 * and priority filters.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MovaIcon } from '@/components/mova-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { useTheme } from '@/hooks/use-theme';
import { Borders, Radius, Spacing } from '@/theme';

const STATUS_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
];

const CATEGORY_OPTIONS = [
  { key: 'all', label: 'All Categories' },
  { key: 'academic', label: 'Academic', dot: '#C8420B' },
  { key: 'personal', label: 'Personal', dot: '#2563EB' },
  { key: 'work', label: 'Work', dot: '#7C3AED' },
  { key: 'health', label: 'Health', dot: '#059669' },
  { key: 'other', label: 'General', dot: '#64748B' },
];

const PRIORITY_OPTIONS = [
  { key: 'all', label: 'All Priorities' },
  { key: 'urgent', label: 'Urgent', dot: '#DC2626' },
  { key: 'high', label: 'High', dot: '#EA580C' },
  { key: 'medium', label: 'Medium', dot: '#D97706' },
  { key: 'low', label: 'Low', dot: '#94A3B8' },
];

export function TaskFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  categoryFilter,
  onCategoryChange,
  priorityFilter,
  onPriorityChange,
  onClearFilters,
  style,
}) {
  const theme = useTheme();

  const hasActiveFilters =
    Boolean(searchQuery) ||
    statusFilter !== 'all' ||
    (categoryFilter && categoryFilter !== 'all') ||
    (priorityFilter && priorityFilter !== 'all');

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.surface, borderColor: theme.border },
        style,
      ]}>
      {/* Search Bar */}
      <ThemedTextInput
        placeholder="Search tasks by title or notes..."
        value={searchQuery}
        onChangeText={onSearchChange}
        style={styles.searchInput}
      />

      {/* Status Segment Control */}
      <View
        style={[
          styles.segmentContainer,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}>
        {STATUS_OPTIONS.map((opt) => {
          const isSelected = statusFilter === opt.key;
          return (
            <Pressable
              key={opt.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              hitSlop={4}
              onPress={() => onStatusChange?.(opt.key)}
              style={({ pressed }) => [
                styles.segmentItem,
                {
                  backgroundColor: isSelected ? theme.primary : 'transparent',
                },
                pressed && { opacity: 0.8 },
              ]}>
              <ThemedText
                type="caption"
                style={[
                  styles.segmentText,
                  {
                    color: isSelected ? theme.primaryText : theme.textSecondary,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}>
                {opt.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* Horizontal Scroll for Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScrollContent}
        style={styles.chipsScroll}>
        {CATEGORY_OPTIONS.map((cat) => {
          const isSelected = (categoryFilter || 'all') === cat.key;
          return (
            <Pressable
              key={cat.key}
              accessibilityRole="button"
              hitSlop={6}
              onPress={() => onCategoryChange?.(cat.key === 'all' ? null : cat.key)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isSelected ? theme.primarySubtle : theme.surface,
                  borderColor: isSelected ? theme.primary : theme.border,
                },
                pressed && { opacity: 0.8 },
              ]}>
              {cat.dot && (
                <View style={[styles.dotIndicator, { backgroundColor: cat.dot }]} />
              )}
              <ThemedText
                type="caption"
                style={[
                  styles.chipText,
                  {
                    color: isSelected ? theme.primary : theme.textSecondary,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}>
                {cat.label}
              </ThemedText>
            </Pressable>
          );
        })}

        {/* Separator */}
        <View style={[styles.chipDivider, { backgroundColor: theme.border }]} />

        {/* Priority Filter Chips */}
        {PRIORITY_OPTIONS.map((prio) => {
          const isSelected = (priorityFilter || 'all') === prio.key;
          return (
            <Pressable
              key={prio.key}
              accessibilityRole="button"
              hitSlop={6}
              onPress={() => onPriorityChange?.(prio.key === 'all' ? null : prio.key)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isSelected ? theme.primarySubtle : theme.surface,
                  borderColor: isSelected ? theme.primary : theme.border,
                },
                pressed && { opacity: 0.8 },
              ]}>
              {prio.dot && (
                <View style={[styles.dotIndicator, { backgroundColor: prio.dot }]} />
              )}
              <ThemedText
                type="caption"
                style={[
                  styles.chipText,
                  {
                    color: isSelected ? theme.primary : theme.textSecondary,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}>
                {prio.label}
              </ThemedText>
            </Pressable>
          );
        })}

        {/* Clear Filters Button */}
        {hasActiveFilters && onClearFilters && (
          <Pressable
            accessibilityRole="button"
            hitSlop={6}
            onPress={onClearFilters}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: theme.errorBackground,
                borderColor: theme.error,
              },
              pressed && { opacity: 0.8 },
            ]}>
            <MovaIcon name="x" size={12} color={theme.error} />
            <ThemedText
              type="caption"
              style={[styles.chipText, { color: theme.error, fontWeight: '700' }]}>
              Reset
            </ThemedText>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: Borders.thin,
    gap: Spacing.xs,
  },
  searchInput: {
    marginBottom: 0,
  },
  segmentContainer: {
    flexDirection: 'row',
    padding: 3,
    gap: 2,
    borderRadius: Radius.md,
    borderWidth: Borders.thin,
  },
  segmentItem: {
    flex: 1,
    minHeight: 32,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 12,
  },
  chipsScroll: {
    marginTop: 2,
  },
  chipsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  chip: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: Borders.thin,
    gap: 5,
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
  },
  chipText: {
    fontSize: 12,
  },
  chipDivider: {
    width: 1,
    height: 18,
    marginHorizontal: 4,
  },
});
