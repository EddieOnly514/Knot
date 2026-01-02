/**
 * Knot Design System - Main Export
 */

export { colors } from './colors';
export { typography } from './typography';
export { spacing, borderRadius } from './spacing';
export { shadows } from './shadows';

export const theme = {
  colors: require('./colors').colors,
  typography: require('./typography').typography,
  spacing: require('./spacing').spacing,
  borderRadius: require('./spacing').borderRadius,
  shadows: require('./shadows').shadows,
} as const;

export type Theme = typeof theme;