import { useEffect, useState } from 'react'

/**
 * Hook to detect if the component has mounted on the client side.
 * 
 * This is useful for preventing SSR issues with libraries that:
 * - Access browser APIs (window, document, navigator)
 * - Measure DOM elements (like Recharts' ResponsiveContainer)
 * - Require client-side rendering
 * 
 * @returns {boolean} true if the component has mounted on the client, false during SSR
 * 
 * @example
 * ```tsx
 * "use client"
 * 
 * import { useIsMounted } from '@/lib/hooks/use-is-mounted'
 * import { ResponsiveContainer, LineChart } from 'recharts'
 * 
 * export function MyChart() {
 *   const isMounted = useIsMounted()
 *   
 *   if (!isMounted) {
 *     return <div>Loading chart...</div>
 *   }
 *   
 *   return (
 *     <ResponsiveContainer>
 *       <LineChart data={data}>...</LineChart>
 *     </ResponsiveContainer>
 *   )
 * }
 * ```
 */
export function useIsMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return isMounted
}

