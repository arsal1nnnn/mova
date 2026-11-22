/**
 * Mova Brand Icons (native)
 *
 * Native builds use the platform glyphs already shipped with Mova; the web
 * variant renders proper SVG marks instead.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export function GoogleLogo({ size = 20 }) {
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <ThemedText
        style={{
          fontSize: size * 0.86,
          lineHeight: size,
          fontWeight: '700',
          color: '#4285F4',
        }}>
        G
      </ThemedText>
    </View>
  );
}

export function AppleLogo({ size = 20, color }) {
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <ThemedText style={{ fontSize: size * 0.95, lineHeight: size, color }}>
        {'\uF8FF'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
