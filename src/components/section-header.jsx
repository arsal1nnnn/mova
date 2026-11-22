/**
 * Mova Section Header
 *
 * Semantic section heading component with consistent typography,
 * optional category badge, and action slots.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/theme';

export function SectionHeader({
  title,
  badge,
  action,
  style,
}) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.titleGroup}>
        <ThemedText type="h3" style={styles.title}>
          {title}
        </ThemedText>
        {badge && (
          <View style={styles.badgeWrap}>
            <ThemedText type="overline" themeColor="textMuted" style={styles.badge}>
              {badge}
            </ThemedText>
          </View>
        )}
      </View>

      {action && <View style={styles.actionSlot}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xxs,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    letterSpacing: -0.2,
  },
  badgeWrap: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.sm,
    backgroundColor: 'transparent',
  },
  badge: {
    letterSpacing: 0.8,
  },
  actionSlot: {
    marginLeft: Spacing.sm,
  },
});
