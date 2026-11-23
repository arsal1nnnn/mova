import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Borders, Radius, Shadow, Spacing } from '@/theme';

export function ThemedCard({
  children,
  variant = 'outlined',
  padding = 'md',
  radius = 'card', // Figma standard is 20px
  onPress,
  style,
  accessibilityRole,
  ...rest
}) {
  const theme = useTheme();

  const getVariantStyle = (pressed) => {
    switch (variant) {
      case 'flat':
        return {
          backgroundColor: theme.surface,
          borderColor: 'transparent',
          borderWidth: 0,
        };
      case 'momentum':
        return {
          backgroundColor: theme.momentumCard || (theme.isDark ? '#30251F' : '#FCE7D7'),
          borderColor: 'transparent',
          borderWidth: 0,
        };
      case 'sage':
        return {
          backgroundColor: theme.sageCard || (theme.isDark ? '#1E281F' : '#E9EFE4'),
          borderColor: 'transparent',
          borderWidth: 0,
        };
      case 'lavender':
        return {
          backgroundColor: theme.lavender || (theme.isDark ? '#373044' : '#EAE4F7'),
          borderColor: 'transparent',
          borderWidth: 0,
        };
      case 'elevated':
        return {
          backgroundColor: theme.cardElevated || theme.surface,
          borderColor: theme.border,
          borderWidth: Borders.thin,
          ...(pressed ? {} : Shadow.sm),
        };
      case 'outlined':
      default:
        return {
          backgroundColor: theme.card || theme.surface,
          borderColor: theme.border,
          borderWidth: Borders.thin,
        };
    }
  };

  const paddingStyle = paddingStyles[padding] ?? paddingStyles.md;
  const radiusValue = Radius[radius] ?? Radius.card ?? 20;

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
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
});

const paddingStyles = StyleSheet.create({
  none: { padding: 0 },
  sm: { padding: 10 },
  md: { padding: 14 }, // Figma 14-15px card padding
  lg: { padding: 20 },
});
