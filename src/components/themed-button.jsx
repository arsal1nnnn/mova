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
      case 'chip':
        return {
          backgroundColor: pressed ? theme.primaryHover : theme.primary,
          borderColor: 'transparent',
          borderWidth: 0,
          borderRadius: Radius.full,
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
      case 'chip':
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
          ) : typeof children === 'string' ? (
            <Text style={[styles.textBase, sizeTextStyle, { color: textColor }, textStyle]}>
              {children}
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
    borderRadius: Radius.button, // Figma 14px button radius
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBase: {
    textAlign: 'center',
    fontWeight: '600',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  iconSlotLeft: {
    marginRight: 6,
  },
  iconSlotRight: {
    marginLeft: 6,
  },
});

const sizeStyles = StyleSheet.create({
  sm: {
    minHeight: 28,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  md: {
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  lg: {
    minHeight: 50,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
});

const textStyles = StyleSheet.create({
  sm: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  md: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  lg: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
  },
});
