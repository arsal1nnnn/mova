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
    // Dynamic require for native SecureStore to keep web/SSR bundle safe
    const SecureStore = require('expo-secure-store');
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
    const SecureStore = require('expo-secure-store');
    if (mode === 'system') {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, mode);
    }
  } catch {
    // Non-fatal
  }
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState('system'); // 'light' | 'dark' | 'system'

  useEffect(() => {
    let isCancelled = false;
    getStoredThemeMode().then((stored) => {
      if (!isCancelled && stored && (stored === 'light' || stored === 'dark' || stored === 'system')) {
        setThemeModeState(stored);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, []);

  const setThemeMode = useCallback((mode) => {
    setThemeModeState(mode);
    setStoredThemeMode(mode);
  }, []);

  const isDark = useMemo(() => {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    return systemScheme === 'dark';
  }, [themeMode, systemScheme]);

  const colors = isDark ? Colors.dark : Colors.light;

  const contextValue = useMemo(() => ({
    ...colors,
    colors,
    colorScheme: isDark ? 'dark' : 'light',
    themeMode,
    setThemeMode,
    isDark,
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
  }), [colors, isDark, themeMode, setThemeMode]);

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

  // Fallback
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
