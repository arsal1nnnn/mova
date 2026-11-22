import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

import {
  Borders,
  Colors,
  Layout,
  Motion,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from './tokens';

const STORAGE_KEY = 'mova_theme_preference';

async function getStoredThemeMode() {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(STORAGE_KEY);
      }
      return null;
    }
    return await SecureStore.getItemAsync(STORAGE_KEY);
  } catch {
    return null;
  }
}

async function setStoredThemeMode(mode) {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (mode === 'system') {
          window.localStorage.removeItem(STORAGE_KEY);
        } else {
          window.localStorage.setItem(STORAGE_KEY, mode);
        }
      }
      return;
    }
    if (mode === 'system') {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, mode);
    }
  } catch {
    // Non-fatal if storage write fails
  }
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Mova Campus design system: Premium light mode is the canonical theme everywhere.
  const [themeMode] = useState('light');
  const setThemeMode = useCallback(() => {}, []);

  const resolvedScheme = 'light';
  const isDark = false;
  const colors = Colors.light;

  const contextValue = useMemo(() => ({
    ...colors,
    colors,
    colorScheme: 'light',
    themeMode: 'light',
    setThemeMode,
    isDark: false,
    tokens: {
      colors,
      typography: Typography,
      spacing: Spacing,
      radius: Radius,
      borders: Borders,
      shadow: Shadow,
      layout: Layout,
      motion: Motion,
    },
  }), [colors, setThemeMode]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context) {
    return context;
  }

  // Pure light mode fallback
  const colors = Colors.light;
  return {
    ...colors,
    colors,
    colorScheme: 'light',
    themeMode: 'light',
    setThemeMode: () => {},
    isDark: false,
    tokens: {
      colors,
      typography: Typography,
      spacing: Spacing,
      radius: Radius,
      borders: Borders,
      shadow: Shadow,
      layout: Layout,
      motion: Motion,
    },
  };
}

export function useThemeMode() {
  const { themeMode, setThemeMode, colorScheme, isDark } = useTheme();
  return { themeMode, setThemeMode, colorScheme, isDark };
}
