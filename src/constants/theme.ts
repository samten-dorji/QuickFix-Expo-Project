/**
 * QuickFix Hostel Maintenance App - Theme System
 * Based on DESIGN.md specifications
 * Blue-and-white palette, Inter typography, modern corporate style
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Fonts = {
  mono: Platform.select({ ios: 'ui-monospace', android: 'monospace', default: 'monospace' }),
};

// Color palette from DESIGN.md
export const Colors = {
  light: {
    // Primary colors
    primary: '#1e40af',
    primaryContainer: '#1e40af',
    onPrimary: '#ffffff',
    onPrimaryContainer: '#a8b8ff',

    // Backgrounds
    background: '#f8f9fb',
    surface: '#f8f9fb',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#f3f4f6',
    surfaceContainer: '#edeef0',
    surfaceContainerHigh: '#e7e8ea',
    surfaceContainerHighest: '#e1e2e4',

    // Text
    onBackground: '#191c1e',
    onSurface: '#191c1e',
    onSurfaceVariant: '#444653',
    text: '#191c1e',
    textSecondary: '#444653',

    // Borders and outlines
    outline: '#757684',
    outlineVariant: '#c4c5d5',

    // Status colors
    error: '#ba1a1a',
    errorContainer: '#ffdad6',
    onError: '#ffffff',
    onErrorContainer: '#93000a',

    // Secondary
    secondary: '#5d5f5f',
    onSecondary: '#ffffff',
    secondaryContainer: '#dfe0e0',
    onSecondaryContainer: '#616363',

    // Tertiary
    tertiary: '#25354a',
    onTertiary: '#ffffff',
    tertiaryContainer: '#3c4c61',
    onTertiaryContainer: '#acbcd6',

    // Background element (for cards)
    backgroundElement: '#f3f4f6',
    backgroundSelected: '#e7e8ea',
  },
  dark: {
    // Dark mode adaptations
    primary: '#b8c4ff',
    primaryContainer: '#173bab',
    onPrimary: '#001453',
    onPrimaryContainer: '#dde1ff',

    background: '#191c1e',
    surface: '#191c1e',
    surfaceContainerLowest: '#131416',
    surfaceContainerLow: '#1e1f21',
    surfaceContainer: '#242527',
    surfaceContainerHigh: '#2e2f31',
    surfaceContainerHighest: '#38393b',

    onBackground: '#e1e2e4',
    onSurface: '#e1e2e4',
    onSurfaceVariant: '#c4c5d5',
    text: '#e1e2e4',
    textSecondary: '#c4c5d5',

    outline: '#8e9099',
    outlineVariant: '#444653',

    error: '#ffb4ab',
    errorContainer: '#93000a',
    onError: '#690005',
    onErrorContainer: '#ffdad6',

    secondary: '#c6c6c7',
    onSecondary: '#2b2d2d',
    secondaryContainer: '#424343',
    onSecondaryContainer: '#e2e2e2',

    tertiary: '#b7c8e1',
    onTertiary: '#1c2f42',
    tertiaryContainer: '#38485d',
    onTertiaryContainer: '#d3e4fe',

    backgroundElement: '#242527',
    backgroundSelected: '#2e2f31',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export { StatusColors, PriorityColors, NeutralBadgeColors } from './badges';

// Typography - Inter font
export const Typography = {
  headlineLG: {
    fontSize: 26,
    fontWeight: '700' as const, fontFamily: 'Inter_700Bold',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  headlineLGMobile: {
    fontSize: 24,
    fontWeight: '700' as const, fontFamily: 'Inter_700Bold',
    lineHeight: 30,
  },
  headlineMD: {
    fontSize: 18,
    fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold',
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  bodyLG: {
    fontSize: 16,
    fontWeight: '400' as const, fontFamily: 'Inter_400Regular',
    lineHeight: 24,
  },
  bodyMD: {
    fontSize: 14,
    fontWeight: '400' as const, fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  labelMD: {
    fontSize: 12,
    fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold',
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
} as const;

// Spacing system (8px base unit)
export const Spacing = {
  half: 4,
  one: 8,
  two: 12,
  three: 16,
  four: 24,
  five: 32,
  six: 48,
} as const;

// Border radius
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

// Platform-specific insets
export const BottomTabInset = Platform.select({ ios: 85, android: 80 }) ?? 80;
export const MaxContentWidth = 600; // Mobile-first design

// Common shadow
export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;
