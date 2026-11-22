/**
 * Mova Icon Component (Native)
 *
 * Lightweight, dependency-free icons for React Native.
 * Uses clean typographic symbols and geometric indicators for native builds.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const GLYPHS = {
  home: '⌂',
  tasks: '✓',
  timetable: '▤',
  attendance: '◷',
  plus: '+',
  check: '✓',
  x: '✕',
  search: '🔍',
  edit: '✎',
  trash: '🗑',
  calendar: '📅',
  clock: '⏱',
  'map-pin': '📍',
  user: '●',
  users: '👥',
  settings: '⚙',
  sun: '☼',
  moon: '☾',
  'chevron-right': '›',
  'chevron-left': '‹',
  'arrow-up-right': '↗',
  sparkle: '✦',
  alert: '!',
  target: '◎',
  upload: '↑',
  download: '↓',
  camera: '📷',
  flame: '🔥',
  zap: '⚡',
  filter: '⑂',
  'trending-up': '📈',
  refresh: '↻',
  'book-open': '📖',
  trophy: '🏆',
  award: '🎖',
  shield: '🛡',
  share: '⤤',
  lock: '🔒',
  eye: '👁',
  'eye-off': '⌀',
  'alert-triangle': '⚠',
  flag: '⚑',
  copy: '📋',
};

export function MovaIcon({ name, size = 18, color = '#1F1B16', style }) {
  const glyph = GLYPHS[name] || '•';

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Text
        style={[
          styles.glyph,
          {
            fontSize: size * 0.85,
            lineHeight: size,
            color,
          },
        ]}>
        {glyph}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    textAlign: 'center',
    fontWeight: '600',
  },
});
