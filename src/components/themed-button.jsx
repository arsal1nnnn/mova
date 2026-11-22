import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Borders, Layout, Radius, Shadow, Spacing, Typography } from '@/theme';

export function ThemedButton({
  title,
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onPress,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  ...rest
}) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  // Determine button styles based on variant
  const getVariantStyles = (pressed) => {
    if (isDisabled) {
      const isBordered = variant === 'outline' || variant === 'surface';
      return {
        backgroundColor:
          variant === 'outline' || variant === 'ghost' ? 'transparent' : theme.disabled,
        borderColor: isBordered ? theme.disabledBorder : 'transparent',
        borderWidth: isBordered ? Borders.thin : 0,
      };
    }

    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: pressed ? theme.secondaryPressed : theme.secondary,
          borderColor: 'transparent',
          borderWidth: 0,
        };
      case 'surface':
        return {
          backgroundColor: pressed ? theme.secondaryPressed : theme.surfaceElevated,
          borderColor: theme.border,
          borderWidth: Borders.thin,
        };
      case 'outline':
        return {
          backgroundColor: pressed ? theme.primarySubtle : 'transparent',
          borderColor: theme.borderFocus,
          borderWidth: Borders.thin,
        };
      case 'ghost':
        return {
          backgroundColor: pressed ? theme.primarySubtle : 'transparent',
          borderColor: 'transparent',
          borderWidth: 0,
        };
      case 'danger':
        return {
          backgroundColor: pressed ? '#B91C1C' : theme.error,
          borderColor: 'transparent',
          borderWidth: 0,
        };
      case 'primary':
      default:
        return {
          backgroundColor: pressed ? theme.primaryPressed : theme.primary,
          borderColor: 'transparent',
          borderWidth: 0,
          ...(pressed ? {} : Shadow.sm),
        };
    }
  };

  // Determine text color based on variant
  const getTextColor = () => {
    if (isDisabled) {
      return theme.textDisabled;
    }
    switch (variant) {
      case 'secondary':
        return theme.secondaryText;
      case 'surface':
        return theme.text;
      case 'outline':
      case 'ghost':
        return theme.primary;
      case 'danger':
        return '#FFFFFF';
      case 'primary':
      default:
        return theme.primaryText;
    }
  };

  const sizeContainerStyle = sizeStyles[size] || sizeStyles.md;
  const sizeTextStyle = textStyles[size] || textStyles.md;
  const textColor = getTextColor();
  const label = typeof title === 'string' ? title : accessibilityLabel;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.base,
        sizeContainerStyle,
        getVariantStyles(pressed),
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.contentRow}>
          {leftIcon && <View style={styles.iconSlotLeft}>{leftIcon}</View>}
          {title ? (
            <Text style={[styles.textBase, sizeTextStyle, { color: textColor }, textStyle]}>
              {title}
            </Text>
          ) : (
            children
          )}
          {rightIcon && <View style={styles.iconSlotRight}>{rightIcon}</View>}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBase: {
    textAlign: 'center',
    fontFamily: Typography.button.fontFamily,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  iconSlotLeft: {
    marginRight: Spacing.xs,
  },
  iconSlotRight: {
    marginLeft: Spacing.xs,
  },
});

const sizeStyles = StyleSheet.create({
  sm: {
    height: Layout.controlHeightSm,
    paddingHorizontal: Spacing.sm,
  },
  md: {
    height: Layout.controlHeightMd,
    paddingHorizontal: Spacing.md,
  },
  lg: {
    height: Layout.controlHeightLg,
    paddingHorizontal: Spacing.lg,
  },
});

const textStyles = StyleSheet.create({
  sm: Typography.label,
  md: Typography.button,
  lg: {
    ...Typography.button,
    fontSize: 16,
    lineHeight: 22,
  },
});
