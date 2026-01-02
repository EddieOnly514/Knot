/**
 * Knot Design System - Spacing
 * Consistent spacing scale
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,    // Buttons
  xl: 16,    // Inputs
  '2xl': 20,
  '3xl': 24, // Cards
  full: 9999,
} as const;

export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;