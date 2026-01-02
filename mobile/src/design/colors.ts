/**
 * Knot Design System - Colors
 * Matches web Tailwind config exactly
 */

export const colors = {
  // Primary Brand Colors (matching web)
  primary: '#0052FF',        // Knot Blue
  primaryLight: '#4D7CFF',   // Knot Blue Light

  // Backgrounds
  background: '#F8F9FA',     // Off-white base
  surface: '#FFFFFF',        // Pure white
  cardBlue: '#EFF6FF',       // Faded blue card background (more visible)

  // Text
  text: {
    main: '#0F172A',         // Slate 900 - Soft Black
    muted: '#64748B',        // Slate 500
    white: '#FFFFFF',
    primary: '#0F172A',      // Backward compat
    secondary: '#64748B',    // Backward compat
  },

  // UI States
  border: '#E2E8F0',         // Slate 200
  danger: '#EF4444',
  success: '#22C55E',        // Green 500
  warning: '#F59E0B',

  // UI - backward compatibility
  ui: {
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    border: '#E2E8F0',
  },

  // Match-specific
  match: {
    verified: '#0052FF',     // Same as primary
    pass: '#94A3B8',         // Slate 400
  },

  // Ride-share brand colors
  rideshare: {
    uber: '#000000',
    lyft: '#FF00BF',
  },

  // Button colors - backward compatibility
  button: {
    primary: '#0052FF',
    primaryText: '#FFFFFF',
    secondary: '#F3F4F6',
    secondaryText: '#0F172A',
    disabled: '#E5E7EB',
    disabledText: '#9CA3AF',
  },

  // Transparency variants
  primaryAlpha: {
    5: 'rgba(0, 82, 255, 0.05)',
    10: 'rgba(0, 82, 255, 0.1)',
    20: 'rgba(0, 82, 255, 0.2)',
  },

  // Slate variants for UI
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    900: '#0F172A',
  },
} as const;

export type Colors = typeof colors;