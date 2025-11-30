/**
 * Shared Design Tokens for proph.bet
 * Used by both web and mobile platforms for consistent styling
 */

// =============================================================================
// COLORS
// =============================================================================

export const colors = {
  // Light theme
  light: {
    background: "#ffffff",
    foreground: "#1e293b",
    card: "#ffffff",
    cardForeground: "#1e293b",
    primary: "#6366f1",
    primaryForeground: "#ffffff",
    secondary: "#f1f5f9",
    secondaryForeground: "#1e293b",
    muted: "#f1f5f9",
    mutedForeground: "#64748b",
    accent: "#f1f5f9",
    accentForeground: "#1e293b",
    border: "#e2e8f0",
    input: "#e2e8f0",
    ring: "#6366f1",
  },

  // Dark theme
  dark: {
    background: "#0f172a",
    foreground: "#f8fafc",
    card: "#1e293b",
    cardForeground: "#f8fafc",
    primary: "#6366f1",
    primaryForeground: "#ffffff",
    secondary: "#334155",
    secondaryForeground: "#f8fafc",
    muted: "#334155",
    mutedForeground: "#94a3b8",
    accent: "#334155",
    accentForeground: "#f8fafc",
    border: "rgba(255, 255, 255, 0.1)",
    input: "rgba(255, 255, 255, 0.15)",
    ring: "#6366f1",
  },

  // Semantic colors (same for both themes)
  semantic: {
    success: "#22c55e",
    successLight: "#22c55e20",
    warning: "#f59e0b",
    warningLight: "#f59e0b20",
    destructive: "#ef4444",
    destructiveLight: "#ef444420",
    info: "#3b82f6",
    infoLight: "#3b82f620",
  },

  // Brand colors
  brand: {
    indigo: "#6366f1",
    indigoLight: "#6366f120",
    purple: "#8b5cf6",
    orange: "#f97316",
  },
} as const;

// =============================================================================
// SPACING
// =============================================================================

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 48,
  "5xl": 64,
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 20,
  full: 9999,
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const typography = {
  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
  },

  // Font weights (React Native uses string values)
  fontWeight: {
    normal: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },

  // Line heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// =============================================================================
// SHADOWS (for React Native)
// =============================================================================

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;

// =============================================================================
// COMPONENT TOKENS
// =============================================================================

export const components = {
  // Card styling
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },

  // Button styling
  button: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    height: 40,
  },

  // Input styling
  input: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    height: 44,
  },

  // Badge styling
  badge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },

  // Tab bar
  tabBar: {
    height: 60,
    paddingBottom: spacing.sm,
  },

  // Header
  header: {
    height: 56,
  },

  // Market card cover height
  marketCardCover: {
    height: 128,
  },
} as const;

// =============================================================================
// ANIMATION
// =============================================================================

export const animation = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

// =============================================================================
// HELPER TYPES
// =============================================================================

export type ThemeMode = "light" | "dark";
export type ColorScheme = typeof colors.light;
export type SemanticColors = typeof colors.semantic;

// =============================================================================
// THEME HELPER
// =============================================================================

/**
 * Get the color scheme for a given theme mode
 */
export function getThemeColors(mode: ThemeMode): ColorScheme {
  return colors[mode];
}

/**
 * Get all colors for a theme (theme colors + semantic + brand)
 */
export function getAllColors(mode: ThemeMode) {
  return {
    ...colors[mode],
    ...colors.semantic,
    ...colors.brand,
  };
}

