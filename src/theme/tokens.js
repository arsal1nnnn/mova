import { Platform } from 'react-native';

/**
 * Mova Design Tokens — Canonical Design System Tokens
 *
 * Visual Direction: Editorial, warm cream, minimal modern college productivity.
 * Palette: Warm cream/off-white canvas, deep charcoal typography,
 * signature warm terracotta/orange accent used with restraint.
 */

// ---------------------------------------------------------------------------
// 1. Primitive Palette (Internal scale — prefer semantic tokens)
// ---------------------------------------------------------------------------
export const palette = {
  // Brand Warm Terracotta / Orange
  brand50: '#FFF7ED',   // Ultra subtle warm tint (light mode active fills)
  brand100: '#FFEDD5',  // Soft tint for badges/chips
  brand200: '#FED7AA',
  brand300: '#FDBA74',
  brand400: '#FB923C',  // Playful energetic accent
  brand500: '#FF7A29',  // Vibrant primary warm orange (dark mode primary)
  brand600: '#EA580C',  // Warm orange hover / pressed
  brand700: '#C8420B',  // High-contrast warm rust orange (light mode primary)
  brand800: '#9A3412',  // Deep warm rust
  brand900: '#7C2D12',

  // Gamification & Status Accents
  streak: '#FF5722',
  quest: '#8B5CF6',
  xp: '#F59E0B',
  level: '#10B981',

  // Neutral Warm Charcoal Scale
  neutral0: '#FFFFFF',
  neutral50: '#FAF7F2',
  neutral100: '#F4EFEA',
  neutral200: '#EBE4D8',
  neutral300: '#D6CCBC',
  neutral400: '#A3988C',
  neutral500: '#7E7467',
  neutral600: '#5A5247',
  neutral700: '#3D352D',
  neutral800: '#26201B',
  neutral900: '#191512',
  neutral950: '#0E0C0A',
};

// ---------------------------------------------------------------------------
// 2. Semantic Color Tokens
// ---------------------------------------------------------------------------
export const Colors = {
  light: {
    // Surfaces & Backgrounds (Refined Premium Light Palette)
    background: '#FAF9F6',                 // Main canvas background
    surface: '#FFFFFF',                    // Clean card & section surface
    surfaceElevated: '#FFFFFF',            // Floating modals, elevated panels
    card: '#FFFFFF',                       // Card canvas
    cardElevated: '#FFFFFF',
    backgroundElement: '#F4F2EE',          // Subtle element background
    backgroundSelected: '#FDF1EB',         // Soft brand selection tint

    // Text & Content
    text: '#252321',                       // Main typography (Deep charcoal)
    textSecondary: '#89847D',              // Secondary typography (Warm slate gray)
    textMuted: '#A39E96',                  // Muted typography
    textDisabled: '#C4BFB8',
    textInverse: '#FFFFFF',

    // Primary Brand Warm Accent (#E87532)
    primary: '#E87532',                    // Signature warm terracotta orange
    primaryHover: '#D46422',
    primaryPressed: '#BF5517',
    primarySubtle: '#FDF1EB',              // Warm accent tint
    primaryText: '#FFFFFF',

    // Secondary Action
    secondary: '#F5F2EC',
    secondaryPressed: '#EBE6DE',
    secondaryText: '#252321',

    // Borders, Outlines & Dividers (#EEEAE4)
    border: '#EEEAE4',                     // Clean subtle structural border
    borderStrong: '#DDD8D0',
    borderFocus: '#E87532',                // Active focus border
    divider: '#F5F2EC',

    // Input States
    inputBackground: '#FFFFFF',
    inputBorder: '#EEEAE4',
    inputBorderFocus: '#E87532',
    inputPlaceholder: '#A39E96',

    // Disabled State
    disabled: '#F4F2EE',
    disabledBorder: '#EEEAE4',

    // Feedback Status
    success: '#27866A',                    // Forest green
    successBackground: '#F0F9F5',
    warning: '#D69A35',                    // Warm golden amber
    warningBackground: '#FEFAF0',
    error: '#D95757',                      // Soft crimson red
    errorBackground: '#FDF3F3',
    info: '#2563EB',                       // Refined sapphire blue
    infoBackground: '#EFF6FF',

    // Status / Metagame Accents
    streak: '#E87532',
    quest: '#7C3AED',
    xp: '#D69A35',
    level: '#27866A',
  },

  dark: {
    // Light mode everywhere: dark maps to the same premium light palette
    background: '#FAF9F6',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',
    backgroundElement: '#F4F2EE',
    backgroundSelected: '#FDF1EB',

    text: '#252321',
    textSecondary: '#89847D',
    textMuted: '#A39E96',
    textDisabled: '#C4BFB8',
    textInverse: '#FFFFFF',

    primary: '#E87532',
    primaryHover: '#D46422',
    primaryPressed: '#BF5517',
    primarySubtle: '#FDF1EB',
    primaryText: '#FFFFFF',

    secondary: '#F5F2EC',
    secondaryPressed: '#EBE6DE',
    secondaryText: '#252321',

    border: '#EEEAE4',
    borderStrong: '#DDD8D0',
    borderFocus: '#E87532',
    divider: '#F5F2EC',

    inputBackground: '#FFFFFF',
    inputBorder: '#EEEAE4',
    inputBorderFocus: '#E87532',
    inputPlaceholder: '#A39E96',

    disabled: '#F4F2EE',
    disabledBorder: '#EEEAE4',

    success: '#27866A',
    successBackground: '#F0F9F5',
    warning: '#D69A35',
    warningBackground: '#FEFAF0',
    error: '#D95757',
    errorBackground: '#FDF3F3',
    info: '#2563EB',
    infoBackground: '#EFF6FF',

    streak: '#E87532',
    quest: '#7C3AED',
    xp: '#D69A35',
    level: '#27866A',
  },
};

// ---------------------------------------------------------------------------
// 3. Typography Scale (System Fonts with Editorial Proportions)
// ---------------------------------------------------------------------------
export const Typography = {
  /** Display heading — hero / milestone screens */
  display: { fontSize: 34, lineHeight: 42, fontWeight: '700', letterSpacing: -0.6 },
  /** H1 — screen titles */
  h1: { fontSize: 26, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4 },
  /** H2 — section headers */
  h2: { fontSize: 20, lineHeight: 28, fontWeight: '600', letterSpacing: -0.2 },
  /** H3 — card titles / quest headers */
  h3: { fontSize: 17, lineHeight: 24, fontWeight: '600', letterSpacing: -0.1 },
  /** Body — default reading text */
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  /** Body strong — emphasized body text */
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  /** Body small — secondary body text */
  bodySmall: { fontSize: 13, lineHeight: 19, fontWeight: '400' },
  /** Body small strong — compact emphasized text */
  bodySmallStrong: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  /** Label — compact controls, tags */
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.2 },
  /** Caption — secondary metadata, helper text */
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0.1 },
  /** Overline — category / streak tracker labels */
  overline: { fontSize: 10, lineHeight: 14, fontWeight: '700', letterSpacing: 1.0, textTransform: 'uppercase' },
  /** Button — interactive button label */
  button: { fontSize: 14, lineHeight: 20, fontWeight: '600', letterSpacing: 0.1 },
  /** Progress / Metric number — streaks, XP counters */
  progressNumber: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3 },
  /** Monospace code text */
  code: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
};

// ---------------------------------------------------------------------------
// 4. Spacing Scale (4-pt Grid)
// ---------------------------------------------------------------------------
export const Spacing = {
  none: 0,
  /** 2 */  xxxs: 2,
  /** 4 */  xxs: 4,
  /** 8 */  xs: 8,
  /** 12 */ sm: 12,
  /** 16 */ md: 16,
  /** 24 */ lg: 24,
  /** 32 */ xl: 32,
  /** 48 */ xxl: 48,
  /** 64 */ xxxl: 64,

  // Template backward-compatibility aliases
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
};

// ---------------------------------------------------------------------------
// 5. Border Radius
// ---------------------------------------------------------------------------
export const Radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 9999,
};

// ---------------------------------------------------------------------------
// 6. Border Widths
// ---------------------------------------------------------------------------
export const Borders = {
  none: 0,
  thin: 1,
  medium: 2,
  thick: 3,
};

// ---------------------------------------------------------------------------
// 7. Elevation / Shadow Scale (Restrained, Warm Ambient)
// ---------------------------------------------------------------------------
export const Shadow = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#1A1612',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#1A1612',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#1A1612',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
};

// ---------------------------------------------------------------------------
// 8. Motion Tokens
// ---------------------------------------------------------------------------
export const Motion = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
  easing: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// ---------------------------------------------------------------------------
// 9. Layout Constants
// ---------------------------------------------------------------------------
export const Layout = {
  maxContentWidth: 780,
  screenPaddingHorizontal: Spacing.md,
  sectionSpacing: Spacing.lg,
  cardPadding: Spacing.md,
  itemGap: Spacing.sm,
  controlHeightSm: 36,
  controlHeightMd: 44,
  controlHeightLg: 50,
  bottomTabHeight: 60,
  bottomTabInset: Platform.select({ ios: 50, android: 80, default: 0 }),
};
