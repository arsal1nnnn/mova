import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Typography } from '@/theme';

export function ThemedText({
  style,
  type = 'body',
  variant,
  color,
  themeColor,
  accessibilityRole,
  ...rest
}) {
  const theme = useTheme();

  // Selected typography key
  const activeType = variant || type;
  const isHeading = ['display', 'h1', 'h2', 'h3', 'title', 'subtitle'].includes(activeType);

  // Resolve text color: color prop > themeColor prop > default variant color > theme.text
  let textColor = theme.text;
  const colorKey = color || themeColor;
  if (colorKey) {
    textColor = theme[colorKey] || colorKey;
  } else if (activeType === 'caption' || activeType === 'small') {
    textColor = theme.textSecondary;
  } else if (activeType === 'linkPrimary') {
    textColor = theme.primary;
  }

  const role = accessibilityRole || (isHeading ? 'header' : undefined);

  return (
    <Text
      accessibilityRole={role}
      style={[
        { color: textColor },
        styles[activeType] || Typography[activeType] || styles.body,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  // Canonical Typography mappings
  display: Typography.display,
  h1: Typography.h1,
  h2: Typography.h2,
  h3: Typography.h3,
  body: Typography.body,
  bodyStrong: Typography.bodyStrong,
  bodySmall: Typography.bodySmall,
  bodySmallStrong: Typography.bodySmallStrong,
  label: Typography.label,
  caption: Typography.caption,
  overline: Typography.overline,
  button: Typography.button,
  progressNumber: Typography.progressNumber,
  code: Typography.code,

  // Starter template backward-compatibility types
  default: Typography.body,
  title: Typography.display,
  subtitle: Typography.h2,
  small: Typography.bodySmall,
  smallBold: Typography.bodySmallStrong,
  link: {
    ...Typography.bodySmall,
    textDecorationLine: 'underline',
  },
  linkPrimary: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
});
