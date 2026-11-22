/**
 * Mova Screen Container
 *
 * Provides safe-area padding on mobile devices, max-width centering on web,
 * and consistent theme background handling for authenticated Mova screens.
 */

import React from 'react';
import { Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { Layout, Spacing } from '@/theme';

export function ScreenContainer({
  children,
  scrollable = true,
  contentContainerStyle,
  style,
  edges = ['top', 'left', 'right'],
  ...rest
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const horizontalPadding = width >= 768 ? Spacing.xl : Spacing.md;

  const ContainerComponent = scrollable ? ScrollView : View;
  const containerProps = scrollable
    ? {
        contentContainerStyle: [
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding },
          contentContainerStyle,
        ],
        showsVerticalScrollIndicator: false,
        keyboardShouldPersistTaps: 'handled',
        automaticallyAdjustKeyboardInsets: true,
        ...rest,
      }
    : {
        style: [
          styles.fixedContent,
          { paddingHorizontal: horizontalPadding },
          contentContainerStyle,
        ],
        ...rest,
      };

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.safeArea, { backgroundColor: theme.background }, style]}>
      <ContainerComponent {...containerProps}>
        <View style={styles.maxWidthWrapper}>{children}</View>
      </ContainerComponent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: Spacing.xl,
  },
  fixedContent: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: Spacing.lg,
  },
  maxWidthWrapper: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    gap: Spacing.lg,
    paddingTop: Platform.OS === 'web' ? Spacing.lg : Spacing.sm,
  },
});
