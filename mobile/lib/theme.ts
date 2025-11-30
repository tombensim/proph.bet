/**
 * Mobile theme configuration using shared design tokens
 */

import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  components,
} from "@proph-bet/shared/design-tokens";

// We use light theme to match the web app
export const theme = {
  colors: {
    ...colors.light,
    ...colors.semantic,
    ...colors.brand,
  },
  spacing,
  borderRadius,
  typography,
  shadows,
  components,
} as const;

// Type exports for TypeScript
export type Theme = typeof theme;
export type ThemeColors = typeof theme.colors;

// Convenience accessors
export const {
  background,
  foreground,
  card,
  cardForeground,
  primary,
  primaryForeground,
  secondary,
  secondaryForeground,
  muted,
  mutedForeground,
  accent,
  accentForeground,
  border,
  input,
  ring,
} = theme.colors;

export const {
  success,
  successLight,
  warning,
  warningLight,
  destructive,
  destructiveLight,
} = colors.semantic;

export const { indigo, indigoLight } = colors.brand;

