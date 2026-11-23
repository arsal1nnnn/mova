/**
 * Mova Task Filter and Search Bar Component
 *
 * Matches Figma 02 · Tasks filter pills:
 * - Rounded pill chips (radius 50px, px 11 py 7)
 * - Active pill: Mova Orange (#EA580C / #FF7A29) with white text
 * - Inactive pills: Card surface (#FFFFFF / #1A202E) with slate text (#8B8179 / #A5A8B3)
 * - Search bar with clean inline text input
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MovaIcon } from '@/components/mova-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme';

const STATUS_FILTERS = [
  { key: 'all', label: 'All tasks' },
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
];

export function TaskFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  categoryFilter,
  onCategoryChange,
  style,
}) {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      {/* Search Input */}
      {typeof searchQuery === 'string' && (
        <ThemedTextInput
          placeholder="Search tasks..."
          value={searchQuery}
          onChangeText={onSearchChange}
          style={styles.searchInput}
        />
      )}

      {/* Filter Chips Row matching Figma */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScroll}>
        {STATUS_FILTERS.map((opt) => {
          const isSelected = (statusFilter || 'all') === opt.key;
          return (
            <Pressable
              key={opt.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              hitSlop={6}
              onPress={() => onStatusChange?.(opt.key)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isSelected ? theme.primary : theme.surface,
                },
                pressed && { opacity: 0.85 },
              ]}>
              <ThemedText
                style={[
                  styles.chipText,
                  {
                    color: isSelected ? '#FFFFFF' : theme.textSecondary,
                  },
                ]}>
                {opt.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    width: '100%',
  },
  searchInput: {
    marginBottom: 4,
  },
  chipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7, // Figma gap 7px
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: Radius.full, // Figma rounded-[50px]
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600',
  },
});
