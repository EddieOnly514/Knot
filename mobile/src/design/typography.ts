/**
 * Knot Design System - Typography
 * Matching web fonts: Plus Jakarta Sans, Inter, JetBrains Mono
 */

import { Platform } from 'react-native';

// Note: For custom fonts in Expo, you need to load them first
// These fallback to system fonts if custom fonts not loaded
const fontFamilies = {
  headline: Platform.select({
    ios: 'PlusJakartaSans-Bold',
    android: 'PlusJakartaSans-Bold',
    default: 'System',
  }),
  headlineMedium: Platform.select({
    ios: 'PlusJakartaSans-SemiBold',
    android: 'PlusJakartaSans-SemiBold',
    default: 'System',
  }),
  body: Platform.select({
    ios: 'Inter-Regular',
    android: 'Inter-Regular',
    default: 'System',
  }),
  bodyMedium: Platform.select({
    ios: 'Inter-Medium',
    android: 'Inter-Medium',
    default: 'System',
  }),
  mono: Platform.select({
    ios: 'JetBrainsMono-Regular',
    android: 'JetBrainsMono-Regular',
    default: 'Menlo',
  }),
};

export const typography = {
  families: fontFamilies,

  styles: {
    // Headlines
    h1: {
      fontFamily: fontFamilies.headline,
      fontSize: 32,
      lineHeight: 40,
      fontWeight: '700' as const,
    },
    h2: {
      fontFamily: fontFamilies.headline,
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '700' as const,
    },
    h3: {
      fontFamily: fontFamilies.headlineMedium,
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '600' as const,
    },
    h4: {
      fontFamily: fontFamilies.headlineMedium,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '600' as const,
    },

    // Body text
    body: {
      fontFamily: fontFamilies.body,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400' as const,
    },
    bodyMedium: {
      fontFamily: fontFamilies.bodyMedium,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '500' as const,
    },
    bodySmall: {
      fontFamily: fontFamilies.body,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400' as const,
    },

    // Caption / labels
    caption: {
      fontFamily: fontFamilies.body,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400' as const,
    },
    captionMedium: {
      fontFamily: fontFamilies.bodyMedium,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500' as const,
    },

    // Mono (for times, codes)
    mono: {
      fontFamily: fontFamilies.mono,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400' as const,
    },

    // Button text
    button: {
      fontFamily: fontFamilies.headline,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '700' as const,
    },
    buttonLarge: {
      fontFamily: fontFamilies.headline,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '700' as const,
    },

    // Label
    label: {
      fontFamily: fontFamilies.bodyMedium,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500' as const,
    },
  },
} as const;

export type Typography = typeof typography;
