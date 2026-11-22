/**
 * Mova Page Header Component
 *
 * Distinctive, editorial header layout for Mova Campus screens.
 * Supports title, subtitle, optional brand tag, user profile avatar button,
 * and primary screen action.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MovaIcon } from '@/components/mova-icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Borders, Radius, Spacing } from '@/theme';

export function PageHeader({
  title,
  subtitle,
  brandTag,
  action,
  userProfile,
  onAvatarPress,
  style,
}) {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.contentColumn}>
        {brandTag && (
          <View
            style={[
              styles.brandTag,
              { backgroundColor: theme.primarySubtle, borderColor: theme.borderFocus },
            ]}>
            <ThemedText type="overline" style={{ color: theme.primary }}>
              {brandTag}
            </ThemedText>
          </View>
        )}

        <ThemedText type="h1" style={styles.title}>
          {title}
        </ThemedText>

        {subtitle && (
          <ThemedText
            type="bodySmall"
            themeColor="textSecondary"
            style={styles.subtitle}>
            {subtitle}
          </ThemedText>
        )}
      </View>

      <View style={styles.actionSlot}>
        {action}
        {onAvatarPress && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open student profile and settings"
            onPress={onAvatarPress}
            style={({ pressed }) => [
              styles.avatarButton,
              {
                backgroundColor: theme.primarySubtle,
                borderColor: theme.borderFocus,
              },
              pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
            ]}>
            <ThemedText style={[styles.avatarGlyph, { color: theme.primary }]}>
              {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : 'M'}
            </ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  contentColumn: {
    flex: 1,
    flexShrink: 1,
    gap: Spacing.xxxs,
  },
  brandTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: Borders.thin,
    marginBottom: Spacing.xxs,
  },
  title: {
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 2,
  },
  actionSlot: {
    marginLeft: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 0,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlyph: {
    fontSize: 16,
    fontWeight: '800',
  },
});
