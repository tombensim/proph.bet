
// Types matching Polymarket API response
export interface PolymarketMarket {
  id: string
  question: string
  description: string
  endDate: string
  outcomes: string // JSON string array
  outcomePrices: string // JSON string array
  volume: string
  image?: string
  icon?: string
  active: boolean
  closed: boolean
  resolved?: boolean
  resolvedOutcome?: string // The winning outcome text (e.g., "Yes", "No")
  tags?: Array<{ id: string; label: string }>
  groupItemTitle?: string
  slug?: string
}

/**
 * Get the Polymarket event URL for a market.
 * For grouped markets, derives the parent event slug from the market slug.
 * 
 * @param polymarketId - The stored polymarketId which can be:
 *   - A numeric ID (legacy format, returns fallback URL)
 *   - A slug (e.g., "elon-musk-of-tweets-december-2025")
 *   - A slug with groupItemTitle (e.g., "elon-musk-of-tweets-december-2025-120-139|120-139")
 * @returns The Polymarket event URL
 */
export function getPolymarketEventUrl(polymarketId: string): string {
  // Check if it's a legacy numeric ID
  if (/^\d+$/.test(polymarketId)) {
    // Fallback for legacy imports - link to Polymarket homepage since we can't construct a valid URL
    return `https://polymarket.com`
  }
  
  // Check if it contains the groupItemTitle separator
  const separatorIndex = polymarketId.indexOf('|')
  let slug: string
  let groupItemTitle: string | undefined
  
  if (separatorIndex !== -1) {
    slug = polymarketId.slice(0, separatorIndex)
    groupItemTitle = polymarketId.slice(separatorIndex + 1)
  } else {
    slug = polymarketId
  }
  
  let eventSlug = slug
  
  // For grouped markets, remove the groupItemTitle suffix to get the parent event slug
  // e.g., "elon-musk-of-tweets-december-2025-120-139" -> "elon-musk-of-tweets-december-2025"
  if (groupItemTitle) {
    // Normalize the groupItemTitle to match URL format (lowercase, spaces to hyphens)
    const normalizedSuffix = groupItemTitle.toLowerCase().replace(/\s+/g, '-')
    if (slug.endsWith(`-${normalizedSuffix}`)) {
      eventSlug = slug.slice(0, -(normalizedSuffix.length + 1))
    }
  }
  
  return `https://polymarket.com/event/${eventSlug}`
}

export type PolymarketFilter = {
  limit?: number
  closed?: boolean
  tag_id?: string
  offset?: number
}

const POLYMARKET_API_URL = "https://gamma-api.polymarket.com/markets"

export async function fetchPolymarketMarkets(filter: PolymarketFilter = {}) {
  const params = new URLSearchParams()
  if (filter.limit) params.append("limit", filter.limit.toString())
  if (filter.closed !== undefined) params.append("closed", filter.closed.toString())
  if (filter.tag_id) params.append("tag_id", filter.tag_id)
  if (filter.offset) params.append("offset", filter.offset.toString())
  
  // Sort by volume to get "relevant" bets
  params.append("order", "volume")
  params.append("ascending", "false")

  // Use standard fetch (works in Node 18+ and Next.js)
  const response = await fetch(`${POLYMARKET_API_URL}?${params.toString()}`, {
     // next: { revalidate: 60 } // This is Next.js specific. If running in script, this might be ignored or valid. 
     // To make it pure for testing, we can pass options or just leave it. 
     // 'fetch' in Node (undici) might not support 'next' option, but it usually ignores unknown options.
     // However, for the Server Action, we WANT caching.
     // I'll leave it, assuming standard fetch ignores it or I can overload.
     // Better: The Action calls this service. The SERVICE just fetches. The Action adds cache control?
     // Or we just keep it here.
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch from Polymarket: ${response.statusText}`)
  }

  const data = await response.json()
  return data as PolymarketMarket[]
}

// Fetch a single market by ID
export async function fetchPolymarketMarketById(id: string): Promise<PolymarketMarket | null> {
  try {
    const response = await fetch(`${POLYMARKET_API_URL}/${id}`, {
      next: { revalidate: 60 } // Cache for 60 seconds
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null // Market not found
      }
      throw new Error(`Failed to fetch market from Polymarket: ${response.statusText}`)
    }

    const data = await response.json()
    return data as PolymarketMarket
  } catch (error) {
    console.error(`Error fetching Polymarket market ${id}:`, error)
    throw error
  }
}


