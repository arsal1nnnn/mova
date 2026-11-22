import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Borders, Layout, Radius, Spacing, Typography } from '@/theme';

export function ThemedTextInput({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  disabled = false,
  style,
  inputStyle,
  placeholderTextColor,
  onFocus,
  onBlur,
  ...textInputProps
}) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const getBorderColor = () => {
    if (error) return theme.error;
    if (isFocused) return theme.borderFocus;
    return theme.inputBorder;
  };

  const getBackgroundColor = () => {
    if (disabled) return theme.disabled;
    return theme.inputBackground;
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <ThemedText
          type="label"
          color={error ? 'error' : isFocused ? 'primary' : 'textSecondary'}
          style={styles.label}>
          {label}
        </ThemedText>
      )}

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: getBackgroundColor(),
            borderColor: getBorderColor(),
            borderWidth: isFocused ? Borders.medium : Borders.thin,
          },
        ]}>
        {leftIcon && <View style={styles.iconSlotLeft}>{leftIcon}</View>}

        <TextInput
          editable={!disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={placeholderTextColor || theme.inputPlaceholder}
          style={[
            styles.input,
            { color: disabled ? theme.textDisabled : theme.text },
            inputStyle,
          ]}
          accessibilityLabel={label}
          accessibilityState={{ disabled }}
          {...textInputProps}
        />

        {rightIcon && <View style={styles.iconSlotRight}>{rightIcon}</View>}
      </View>

      {error ? (
        <ThemedText type="caption" color="error" style={styles.feedbackText}>
          {error}
        </ThemedText>
      ) : hint ? (
        <ThemedText type="caption" color="textSecondary" style={styles.feedbackText}>
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: Spacing.xs,
  },
  label: {
    marginBottom: Spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: Layout.controlHeightMd,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
  input: {
    flex: 1,
    height: '100%',
    ...Typography.body,
    padding: 0,
  },
  iconSlotLeft: {
    marginRight: Spacing.xs,
  },
  iconSlotRight: {
    marginLeft: Spacing.xs,
  },
  feedbackText: {
    marginTop: Spacing.xxs,
    marginLeft: Spacing.xxs,
  },
});
