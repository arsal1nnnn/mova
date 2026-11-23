/**
 * Mova Campus — Themed Text Input Component
 *
 * Consistent, accessible form input component:
 * - Proper visible labels with optional required marker.
 * - Distinct focus, active, error, success, disabled, and loading states.
 * - Multiline support with vertical alignment and comfortable padding.
 * - Clear helper / error / success validation messages below the field.
 * - Cross-platform touch targets and accessible label associations.
 */

import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { MovaIcon } from '@/components/mova-icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Borders, Layout, Radius, Spacing, Typography } from '@/theme';

export function ThemedTextInput({
  label,
  required = false,
  error,
  success,
  hint,
  leftIcon,
  rightIcon,
  loading = false,
  disabled = false,
  multiline = false,
  numberOfLines,
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

  const hasError = Boolean(error);
  const hasSuccess = Boolean(success) && !hasError;

  const getBorderColor = () => {
    if (hasError) return theme.error;
    if (hasSuccess) return theme.success;
    if (isFocused) return theme.primary;
    return theme.border;
  };

  const getBackgroundColor = () => {
    if (disabled) return theme.disabled;
    return theme.surface;
  };

  const getLabelColor = () => {
    if (hasError) return theme.error;
    if (isFocused) return theme.primary;
    return theme.text;
  };

  return (
    <View style={[styles.container, style]}>
      {/* 1. Visible Label */}
      {label && (
        <View style={styles.labelRow}>
          <ThemedText style={[styles.label, { color: getLabelColor() }]}>
            {label}
          </ThemedText>
          {required && (
            <ThemedText style={[styles.requiredAsterisk, { color: theme.primary }]}>
              *
            </ThemedText>
          )}
        </View>
      )}

      {/* 2. Input Box Surface */}
      <View
        style={[
          styles.inputWrapper,
          multiline && styles.inputWrapperMultiline,
          {
            backgroundColor: getBackgroundColor(),
            borderColor: getBorderColor(),
            borderWidth: isFocused ? Borders.medium : Borders.thin,
          },
        ]}>
        {leftIcon && <View style={styles.iconSlotLeft}>{leftIcon}</View>}

        <TextInput
          editable={!disabled && !loading}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={placeholderTextColor || theme.textSecondary}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            { color: disabled ? theme.textDisabled : theme.text },
            inputStyle,
          ]}
          accessibilityLabel={label}
          accessibilityState={{ disabled: disabled || loading }}
          {...textInputProps}
        />

        {/* Right slot: loading, success icon, or custom rightIcon */}
        {loading ? (
          <View style={styles.iconSlotRight}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        ) : hasSuccess ? (
          <View style={styles.iconSlotRight}>
            <MovaIcon name="check" size={14} color={theme.success} strokeWidth={2.5} />
          </View>
        ) : rightIcon ? (
          <View style={styles.iconSlotRight}>{rightIcon}</View>
        ) : null}
      </View>

      {/* 3. Feedback / Helper message below the input */}
      {hasError ? (
        <View style={styles.messageRow}>
          <MovaIcon name="alert-triangle" size={12} color={theme.error} />
          <ThemedText type="caption" style={[styles.messageText, { color: theme.error }]}>
            {error}
          </ThemedText>
        </View>
      ) : hasSuccess && typeof success === 'string' ? (
        <View style={styles.messageRow}>
          <MovaIcon name="check" size={12} color={theme.success} />
          <ThemedText type="caption" style={[styles.messageText, { color: theme.success }]}>
            {success}
          </ThemedText>
        </View>
      ) : hint ? (
        <ThemedText type="caption" color="textSecondary" style={styles.hintText}>
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  requiredAsterisk: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: Radius.button, // 14px button/input radius
    paddingHorizontal: Spacing.md,
  },
  inputWrapperMultiline: {
    height: undefined,
    minHeight: 88,
    paddingVertical: Spacing.sm,
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    padding: 0,
  },
  inputMultiline: {
    minHeight: 68,
  },
  iconSlotLeft: {
    marginRight: Spacing.xs,
  },
  iconSlotRight: {
    marginLeft: Spacing.xs,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginLeft: 2,
  },
  messageText: {
    fontSize: 12,
    fontWeight: '500',
  },
  hintText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2,
  },
});
