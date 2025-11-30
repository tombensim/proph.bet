import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Re-export shared utilities
export {
  generateGradient,
  generateGradientColors,
  formatBytes,
  formatPoints,
  calculateProbability,
  formatProbability,
  generateId,
  truncateText,
  parseDate,
  isPastDate,
} from "@proph-bet/shared/utils"

// Re-export design tokens
export * from "@proph-bet/shared/design-tokens"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
