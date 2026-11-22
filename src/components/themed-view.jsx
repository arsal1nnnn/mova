import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Borders, Radius } from '@/theme';

export function ThemedView({
  style,
  lightColor,
  darkColor,
  type,
  variant,
  bordered = false,
  rounded,
  ...otherProps
}) {
  const theme = useTheme();

  // Resolve background color: manual light/dark override > variant/type token > default background
  let backgroundColor = theme[variant || type || 'background'];
  if (theme.colorScheme === 'dark' && darkColor) {
    backgroundColor = darkColor;
  } else if (theme.colorScheme === 'light' && lightColor) {
    backgroundColor = lightColor;
  }

  const computedStyle = [
    { backgroundColor },
    bordered && {
      borderColor: theme.border,
      borderWidth: Borders.thin,
    },
    rounded && {
      borderRadius: Radius[rounded] ?? Radius.md,
    },
    style,
  ];

  return <View style={computedStyle} {...otherProps} />;
}
