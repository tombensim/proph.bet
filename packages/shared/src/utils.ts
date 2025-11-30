/**
 * Generate a gradient background from an ID string
 * Platform-agnostic utility for consistent gradients across web and mobile
 */
export function generateGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 30 + (Math.abs(hash) % 60)) % 360;
  const h3 = (h2 + 60 + (Math.abs((hash >> 8)) % 60)) % 360;

  const c1 = `hsl(${h1}, 70%, 75%)`;
  const c2 = `hsl(${h2}, 80%, 65%)`;
  const c3 = `hsl(${h3}, 70%, 75%)`;

  const angle = Math.abs(hash % 180) + 90;

  return `linear-gradient(${angle}deg, ${c1}, ${c2}, ${c3})`;
}

/**
 * Generate gradient colors as an array (for React Native LinearGradient)
 */
export function generateGradientColors(id: string): {
  colors: string[];
  angle: number;
} {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 30 + (Math.abs(hash) % 60)) % 360;
  const h3 = (h2 + 60 + (Math.abs((hash >> 8)) % 60)) % 360;

  const colors = [
    `hsl(${h1}, 70%, 75%)`,
    `hsl(${h2}, 80%, 65%)`,
    `hsl(${h3}, 70%, 75%)`,
  ];

  const angle = Math.abs(hash % 180) + 90;

  return { colors, angle };
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (!+bytes) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format a number as currency/points with proper formatting
 */
export function formatPoints(points: number): string {
  return new Intl.NumberFormat().format(points);
}

/**
 * Calculate implied probability from liquidity pools (CPMM)
 */
export function calculateProbability(
  optionLiquidity: number,
  allLiquidities: number[]
): number {
  const inverseSum = allLiquidities.reduce((sum, l) => sum + 1 / l, 0);
  return 1 / optionLiquidity / inverseSum;
}

/**
 * Format probability as percentage
 */
export function formatProbability(probability: number): string {
  return `${(probability * 100).toFixed(1)}%`;
}

/**
 * Generate a random ID (for idempotency keys, etc.)
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Parse date string to Date object (handles ISO strings)
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Check if a date is in the past
 */
export function isPastDate(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  return d < new Date();
}
