import { useEffect, useState } from 'react'

/**
 * Hook to detect if the component has mounted on the client side.
 * 
 * @returns {boolean} true if the component has mounted on the client, false during SSR
 */
export function useIsMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line
    setIsMounted(true)
  }, [])

  return isMounted
}
