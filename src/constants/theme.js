/**
 * Legacy Theme Compatibility Layer
 *
 * NOTE: Canonical Mova design tokens now live in `src/theme/index.js`.
 * This module is maintained purely for backward compatibility with starter template
 * components and will be safely phased out in subsequent phases.
 */

import '@/global.css';

import { Platform } from 'react-native';

import { Colors, Layout, Spacing } from '@/theme';

export { Colors, Spacing };

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const BottomTabInset = Layout.bottomTabInset;
export const MaxContentWidth = Layout.maxContentWidth;
