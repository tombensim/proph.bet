import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateGradient(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 30 + (Math.abs(hash) % 60)) % 360;
  const h3 = (h2 + 60 + (Math.abs(hash >> 8) % 60)) % 360;

  const c1 = `hsl(${h1}, 70%, 75%)`;
  const c2 = `hsl(${h2}, 80%, 65%)`;
  const c3 = `hsl(${h3}, 70%, 75%)`;

  const angle = Math.abs(hash % 180) + 90; // 90-270 degrees usually looks better for cards

  return `linear-gradient(${angle}deg, ${c1}, ${c2}, ${c3})`;
}
