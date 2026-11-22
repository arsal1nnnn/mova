/**
 * Mova Empty State Component
 *
 * Polished, minimal empty-state container using Mova design tokens.
 * Communicates upcoming feature slots clearly with clean iconography
 * instead of hacky emojis.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { MovaIcon } from '@/components/mova-icon';
import { ThemedCard } from '@/components/themed-card';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Borders, Radius, Spacing } from '@/theme';

export function EmptyState({
  iconName = 'sparkle',
  iconText,
  title,
  description,
  action,
  style,
}) {
  const theme = useTheme();

  return (
    <ThemedCard variant="outlined" style={[styles.card, style]}>
      <View
        style={[
          styles.iconBadge,
          {
            backgroundColor: theme.primarySubtle,
            borderColor: theme.border,
          },
        ]}>
        {iconName ? (
          <MovaIcon name={iconName} size={22} color={theme.primary} />
        ) : (
          <ThemedText style={[styles.iconGlyph, { color: theme.primary }]}>
            {iconText || '✦'}
          </ThemedText>
        )}
      </View>

      <ThemedText type="bodyStrong" style={styles.title}>
        {title}
      </ThemedText>

      {description && (
        <ThemedText
          type="bodySmall"
          themeColor="textSecondary"
          style={styles.description}>
          {description}
        </ThemedText>
      )}

      {action && <View style={styles.actionContainer}>{action}</View>}
    </ThemedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    gap: Spacing.xs,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    borderWidth: Borders.thin,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  iconGlyph: {
    fontSize: 20,
    fontWeight: '600',
  },
  title: {
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  description: {
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 20,
  },
  actionContainer: {
    marginTop: Spacing.sm,
  },
});
