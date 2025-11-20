"use client"

import { useIsMounted } from '@/lib/hooks/use-is-mounted'
import { ReactNode } from 'react'

interface ClientOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Wrapper component that only renders its children on the client side.
 * 
 * This prevents SSR issues with:
 * - Libraries that access browser APIs (window, document, navigator)
 * - Components that measure DOM elements (Recharts, etc.)
 * - Third-party components that aren't SSR-compatible
 * 
 * @param {ReactNode} children - The content to render only on the client
 * @param {ReactNode} fallback - Optional fallback to show during SSR (defaults to null)
 * 
 * @example
 * ```tsx
 * import { ClientOnly } from '@/components/ui/client-only'
 * import { ResponsiveContainer, LineChart } from 'recharts'
 * 
 * export function MyChart() {
 *   return (
 *     <ClientOnly fallback={<div>Loading chart...</div>}>
 *       <ResponsiveContainer>
 *         <LineChart data={data}>...</LineChart>
 *       </ResponsiveContainer>
 *     </ClientOnly>
 *   )
 * }
 * ```
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const isMounted = useIsMounted()

  if (!isMounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

