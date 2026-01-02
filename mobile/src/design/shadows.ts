/**
 * Knot Design System - Shadows
 * Blue-tinted shadows matching web design
 */

export const shadows = {
  // No shadow
  none: {},

  // Card shadow (subtle blue tint)
  card: {
    shadowColor: '#0052FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  // Float shadow (more prominent)
  float: {
    shadowColor: '#0052FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },

  // Modal shadow (bottom sheet style)
  modal: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 8,
  },

  // Button shadow
  button: {
    shadowColor: '#0052FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;

export type Shadows = typeof shadows;