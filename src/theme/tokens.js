import { Platform } from 'react-native';

/**
 * Mova Design Tokens — Figma Reference Canonical Tokens
 *
 * Source: Figma File "Mova — Mobile App UI Reference" (5TbNUE6SjaeJJyfAj8s0Xu)
 * Visual Direction: Warm, calm, focused, quietly playful, generous spacing.
 *
 * Light Theme:
 * - Canvas Background: Warm Ivory (#FFF7ED)
 * - Primary Brand Accent: Mova Orange (#EA580C)
 * - Surfaces / Cards: Clean White (#FFFFFF, rounded 20px)
 * - Text Primary: Deep Charcoal (#24211F)
 * - Text Secondary: Warm Slate (#8B8179)
 * - Subtle Borders: Warm Sand (#F0E6DC)
 * - Accent Tints: Soft Lavender (#EAE4F7 / #75649B), Muted Sage (#DDE8D8 / #536B50), Warm Peach (#FFF0E4)
 *
 * Dark Theme:
 * - Canvas Background: Midnight (#0B0D12)
 * - Primary Brand Accent: Vibrant Warm Orange (#FF7A29)
 * - Surfaces / Cards: Dark Surface (#1A202E, rounded 20px)
 * - Text Primary: Off-White (#F5F3F0)
 * - Text Secondary: Muted Silver (#A5A8B3)
 * - Subtle Borders: Charcoal Slate (#2C3342)
 * - Accent Tints: Dark Lavender (#373044 / #D8C7F4), Dark Sage (#253526 / #9FC09A), Dark Peach (#39271F)
 */

// ---------------------------------------------------------------------------
// 1. Primitive Palette
// ---------------------------------------------------------------------------
export const palette = {
  // Brand Warm Terracotta / Orange
  brand50: '#FFF7ED',   // Warm Ivory canvas background
  brand100: '#FFF0E4',  // Light chip / tint background
  brand200: '#FCE7D7',  // Daily momentum light hero card
  brand300: '#F4D3BC',  // Progress track background
  brand400: '#FB923C',
  brand500: '#FF7A29',  // Dark mode primary orange
  brand600: '#EA580C',  // Light mode signature Mova Orange
  brand700: '#C8420B',  // High-contrast pressed orange
  brand800: '#9A3412',
  brand900: '#7C2D12',

  // Neutrals (Light: Warm Charcoal, Dark: Midnight)
  neutral0: '#FFFFFF',
  neutral50: '#FFF7ED',
  neutral100: '#F7F2EC',
  neutral200: '#F0E6DC', // Light border
  neutral300: '#DDD8D0',
  neutral400: '#A5A8B3', // Dark text secondary
  neutral500: '#8B8179', // Light text secondary
  neutral600: '#5A5247',
  neutral700: '#3D352D',
  neutral800: '#2C3342', // Dark border
  neutral850: '#1A202E', // Dark surface
  neutral900: '#24211F', // Light text primary
  neutral950: '#0B0D12', // Dark midnight background
  darkText: '#F5F3F0',   // Dark text primary

  // Figma Accent Colors
  lavenderLight: '#EAE4F7',
  lavenderLightText: '#75649B',
  lavenderDark: '#373044',
  lavenderDarkText: '#D8C7F4',

  sageLight: '#DDE8D8',
  sageLightBg: '#E9EFE4',
  sageLightText: '#536B50',
  sageDark: '#1E281F',
  sageDarkText: '#9FC09A',

  // Dark momentum
  momentumDarkCard: '#30251F',
  momentumDarkChip: '#493024',
  momentumDarkTrack: '#594034',
};

// ---------------------------------------------------------------------------
// 2. Semantic Color Tokens
// ---------------------------------------------------------------------------
export const Colors = {
  light: {
    // Surfaces & Backgrounds
    background: '#FFF7ED',                 // Warm Ivory canvas
    surface: '#FFFFFF',                    // Card surface
    surfaceElevated: '#FFFFFF',
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',
    backgroundElement: '#FFF0E4',          // Element chip tint
    backgroundSelected: '#FFF0E4',

    // Text & Content
    text: '#24211F',                       // Deep charcoal
    textSecondary: '#8B8179',              // Slate secondary
    textMuted: '#A3988C',
    textDisabled: '#C4BFB8',
    textInverse: '#FFFFFF',

    // Primary Brand Warm Accent (#EA580C)
    primary: '#EA580C',
    primaryHover: '#C8420B',
    primaryPressed: '#9A3412',
    primarySubtle: '#FFF0E4',
    primaryText: '#FFFFFF',

    // Secondary Action
    secondary: '#F7F2EC',
    secondaryPressed: '#EBE4DC',
    secondaryText: '#24211F',

    // Borders & Dividers
    border: '#F0E6DC',
    borderStrong: '#DDD8D0',
    borderFocus: '#EA580C',
    divider: '#F0E6DC',

    // Input States
    inputBackground: '#FFFFFF',
    inputBorder: '#F0E6DC',
    inputBorderFocus: '#EA580C',
    inputPlaceholder: '#8B8179',

    // Disabled State
    disabled: '#F7F2EC',
    disabledBorder: '#F0E6DC',

    // Figma Themed Accent Surfaces
    momentumCard: '#FCE7D7',
    momentumChip: '#FFFFFF',
    momentumTrack: '#F4D3BC',
    momentumFill: '#EA580C',

    lavender: '#EAE4F7',
    lavenderText: '#75649B',

    sage: '#DDE8D8',
    sageCard: '#E9EFE4',
    sageText: '#536B50',

    // Feedback Status
    success: '#536B50',
    successBackground: '#E9EFE4',
    warning: '#EA580C',
    warningBackground: '#FFF0E4',
    error: '#D95757',
    errorBackground: '#FDF3F3',
    info: '#75649B',
    infoBackground: '#EAE4F7',

    // Bottom Navigation
    bottomNavBg: '#FFFFFF',
    bottomNavBorder: '#F0E6DC',
    bottomNavActive: '#EA580C',
    bottomNavInactive: '#8B8179',

    // Status / Metagame
    streak: '#EA580C',
    quest: '#75649B',
    xp: '#EA580C',
    level: '#536B50',
  },

  dark: {
    // Surfaces & Backgrounds
    background: '#0B0D12',                 // Midnight canvas
    surface: '#1A202E',                    // Dark surface card
    surfaceElevated: '#1A202E',
    card: '#1A202E',
    cardElevated: '#242B3D',
    backgroundElement: '#39271F',
    backgroundSelected: '#39271F',

    // Text & Content
    text: '#F5F3F0',                       // Off-white primary text
    textSecondary: '#A5A8B3',              // Muted silver secondary text
    textMuted: '#6B7280',
    textDisabled: '#4B5563',
    textInverse: '#0B0D12',

    // Primary Brand Warm Accent (#FF7A29)
    primary: '#FF7A29',
    primaryHover: '#EA580C',
    primaryPressed: '#C8420B',
    primarySubtle: '#39271F',
    primaryText: '#FFFFFF',

    // Secondary Action
    secondary: '#1A202E',
    secondaryPressed: '#242B3D',
    secondaryText: '#F5F3F0',

    // Borders & Dividers
    border: '#2C3342',                     // Dark border
    borderStrong: '#3D4758',
    borderFocus: '#FF7A29',
    divider: '#2C3342',

    // Input States
    inputBackground: '#1A202E',
    inputBorder: '#2C3342',
    inputBorderFocus: '#FF7A29',
    inputPlaceholder: '#A5A8B3',

    // Disabled State
    disabled: '#1A202E',
    disabledBorder: '#2C3342',

    // Figma Themed Accent Surfaces
    momentumCard: '#30251F',
    momentumChip: '#493024',
    momentumTrack: '#594034',
    momentumFill: '#FF7A29',

    lavender: '#373044',
    lavenderText: '#D8C7F4',

    sage: '#1E281F',
    sageCard: '#1E281F',
    sageText: '#9FC09A',

    // Feedback Status
    success: '#27866A',
    successBackground: '#152920',
    warning: '#FF7A29',
    warningBackground: '#39271F',
    error: '#EF4444',
    errorBackground: '#3B1A1A',
    info: '#7C6DAF',
    infoBackground: '#262038',

    // Bottom Navigation
    bottomNavBg: '#1A202E',
    bottomNavBorder: '#2C3342',
    bottomNavActive: '#FF7A29',
    bottomNavInactive: '#A5A8B3',

    // Status / Metagame
    streak: '#FF7A29',
    quest: '#D8C7F4',
    xp: '#FF7A29',
    level: '#9FC09A',
  },
};

// ---------------------------------------------------------------------------
// 3. Typography Scale (Figma Reference Proportions)
// ---------------------------------------------------------------------------
export const Typography = {
  /** Figma Hero Wordmark */
  wordmark: { fontSize: 18, lineHeight: 22, fontWeight: '700', letterSpacing: -0.2 },
  /** Figma Date Overline */
  dateOverline: { fontSize: 9, lineHeight: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },

  /** Display heading / Momentum Title */
  display: { fontSize: 27, lineHeight: 33, fontWeight: '700', letterSpacing: -0.4 },
  /** H1 — Screen Titles (e.g. "Your tasks", "Timetable", "Good afternoon") */
  h1: { fontSize: 24, lineHeight: 29, fontWeight: '700', letterSpacing: -0.3 },
  /** H2 — Section Headers (e.g. "Today's focus", "Your schedule") */
  h2: { fontSize: 16, lineHeight: 20, fontWeight: '700', letterSpacing: -0.2 },
  /** H3 — Card Titles */
  h3: { fontSize: 15, lineHeight: 19, fontWeight: '600', letterSpacing: -0.1 },

  /** Stat value numbers (08, 2.4h, 92%) */
  statNumber: { fontSize: 22, lineHeight: 27, fontWeight: '700', letterSpacing: -0.3 },
  /** Stat label ("Tasks done", "Focus time") */
  statLabel: { fontSize: 10, lineHeight: 12, fontWeight: '400' },

  /** Body — default reading text */
  body: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  bodyStrong: { fontSize: 14, lineHeight: 20, fontWeight: '600' },

  /** Task Item Titles */
  taskTitle: { fontSize: 13, lineHeight: 16, fontWeight: '600' },
  taskSubtitle: { fontSize: 10, lineHeight: 12, fontWeight: '400' },

  /** Body small & captions */
  bodySmall: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  bodySmallStrong: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  caption: { fontSize: 11, lineHeight: 14, fontWeight: '400' },
  captionStrong: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
  overline: { fontSize: 10, lineHeight: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },

  /** Chip Text (Streak, XP, time pills) */
  chip: { fontSize: 11, lineHeight: 13, fontWeight: '600' },
  button: { fontSize: 14, lineHeight: 20, fontWeight: '600' },

  /** Monospace code text */
  code: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
};

// ---------------------------------------------------------------------------
// 4. Spacing Scale (Matching Figma Padding & Gaps)
// ---------------------------------------------------------------------------
export const Spacing = {
  none: 0,
  /** 2 */  xxxs: 2,
  /** 4 */  xxs: 4,
  /** 7 */  chipGap: 7,
  /** 8 */  xs: 8,
  /** 10 */ taskGap: 10,
  /** 12 */ sm: 12,
  /** 14 */ cardPad: 14,
  /** 15 */ screenPad: 15,
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
// 5. Border Radius (Figma Reference Radii)
// ---------------------------------------------------------------------------
export const Radius = {
  none: 0,
  /** Timeline bar */ xs: 4,
  /** Minor accents */ sm: 8,
  /** Progress track */ track: 10,
  /** Checkbox */ checkbox: 11,
  /** Day pills in week strip */ dayPill: 13,
  /** Primary button */ button: 14,
  /** Quest card */ quest: 17,
  /** Avatar / Icon A */ avatar: 21,
  /** Floating bottom nav */ nav: 22,
  /** Figma Cards (Default card border-radius) */ card: 20,
  /** Screen outer container */ screen: 30,
  /** Chips / Rounded full */ full: 50,
  // Compatibility aliases
  md: 14,
  lg: 20,
  xl: 22,
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
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#1A1612',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  lg: {
    shadowColor: '#1A1612',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
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
  maxContentWidth: 480, // Mobile-first width target
  screenPaddingHorizontal: 24, // Figma 24px horizontal padding
  sectionSpacing: Spacing.sm,
  cardPadding: 15,
  itemGap: 10,
  controlHeightSm: 32,
  controlHeightMd: 44,
  controlHeightLg: 50,
  bottomTabHeight: 56,
  bottomTabInset: Platform.select({ ios: 24, android: 16, default: 16 }),
};
