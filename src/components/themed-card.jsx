import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Borders, Radius, Shadow, Spacing } from '@/theme';

export function ThemedCard({
  children,
  variant = 'elevated',
  padding = 'md',
  radius = 'lg',
  onPress,
  style,
  accessibilityRole,
  ...rest
}) {
  const theme = useTheme();

  const getVariantStyle = (pressed) => {
    switch (variant) {
      case 'outlined':
        return {
          backgroundColor: theme.card,
          borderColor: theme.border,
          borderWidth: Borders.thin,
        };
      case 'flat':
        return {
          backgroundColor: theme.surface,
          borderColor: 'transparent',
          borderWidth: 0,
        };
      case 'elevated':
      default:
        return {
          backgroundColor: theme.cardElevated,
          // A hairline border plus a soft shadow keeps light cards crisp
          borderColor: theme.border,
          borderWidth: Borders.thin,
          ...(pressed ? {} : Shadow.sm),
        };
    }
  };

  const paddingStyle = paddingStyles[padding] ?? paddingStyles.md;
  const radiusValue = Radius[radius] ?? Radius.lg;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole={accessibilityRole || 'button'}
        style={({ pressed }) => [
          styles.base,
          { borderRadius: radiusValue },
          paddingStyle,
          getVariantStyle(pressed),
          pressed && styles.pressed,
          style,
        ]}
        {...rest}>
        {children}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.base,
        { borderRadius: radiusValue },
        paddingStyle,
        getVariantStyle(false),
        style,
      ]}
      accessibilityRole={accessibilityRole}
      {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});

const paddingStyles = StyleSheet.create({
  none: { padding: 0 },
  sm: { padding: Spacing.sm },
  md: { padding: Spacing.md },
  lg: { padding: Spacing.lg },
});
