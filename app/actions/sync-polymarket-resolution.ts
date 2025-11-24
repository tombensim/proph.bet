"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { fetchPolymarketMarketById } from "@/lib/polymarket-service"
import { resolveMarketAction } from "./resolve-market"
import { revalidatePath } from "next/cache"

export type SyncResult = 
  | { success: true; message: string }
  | { success: false; error: string }

/**
 * Syncs the resolution status of a Polymarket-imported market
 * If the market is resolved on Polymarket, it will resolve it locally
 */
export async function syncPolymarketResolutionAction(marketId: string): Promise<SyncResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    // Fetch the market from database
    const market = await prisma.market.findUnique({
      where: { id: marketId },
      include: { 
        options: true,
        creator: true
      }
    })

    if (!market) {
      return { success: false, error: "Market not found" }
    }

    // Check if user is admin or creator
    const isAdmin = session.user.role === "ADMIN" || session.user.role === "GLOBAL_ADMIN"
    const isCreator = market.creatorId === session.user.id
    
    if (!isAdmin && !isCreator) {
      return { success: false, error: "Only admins or market creators can sync resolutions" }
    }

    // Check if market is from Polymarket
    if (market.source !== "POLYMARKET" || !market.polymarketId) {
      return { success: false, error: "Market is not imported from Polymarket" }
    }

    // Check if already resolved
    if (market.status === "RESOLVED") {
      return { success: false, error: "Market is already resolved" }
    }

    // Fetch current data from Polymarket
    const polymarketData = await fetchPolymarketMarketById(market.polymarketId)

    if (!polymarketData) {
      return { success: false, error: "Could not fetch market data from Polymarket" }
    }

    // Check if resolved on Polymarket
    // The Polymarket API uses 'closed' to indicate the market has ended
    // We need to check if there's a resolution outcome
    if (!polymarketData.closed) {
      return { success: false, error: "Market is not yet closed on Polymarket" }
    }

    // For resolved markets, Polymarket might not have explicit resolution data in the basic API
    // We'll need to infer from the prices - if one outcome is at 1.0 or very close, it's the winner
    let winningOutcome: string | null = null
    
    try {
      const outcomes = JSON.parse(polymarketData.outcomes)
      const prices = JSON.parse(polymarketData.outcomePrices).map((p: string) => parseFloat(p))
      
      // Find the outcome with price closest to 1.0 (100%)
      let maxPrice = 0
      let maxPriceIndex = -1
      
      prices.forEach((price: number, index: number) => {
        if (price > maxPrice) {
          maxPrice = price
          maxPriceIndex = index
        }
      })
      
      // Consider it resolved if the highest price is > 0.95 (95%)
      if (maxPrice > 0.95 && maxPriceIndex >= 0) {
        winningOutcome = outcomes[maxPriceIndex]
      }
    } catch (e) {
      return { success: false, error: "Failed to parse Polymarket outcome data" }
    }

    if (!winningOutcome) {
      return { success: false, error: "Market is closed but resolution is not yet clear on Polymarket" }
    }

    // Map the winning outcome to our option
    const winningOption = market.options.find(
      opt => opt.text.toLowerCase() === winningOutcome!.toLowerCase()
    )

    if (!winningOption) {
      return { 
        success: false, 
        error: `Could not map Polymarket outcome "${winningOutcome}" to local options` 
      }
    }

    // Resolve the market using the existing action
    try {
      await resolveMarketAction({
        marketId: market.id,
        winningOptionId: winningOption.id,
        resolutionImage: undefined
      })

      // Revalidate the market page
      if (market.arenaId) {
        revalidatePath(`/arenas/${market.arenaId}/markets/${market.id}`)
        revalidatePath(`/arenas/${market.arenaId}/markets`)
      }

      return { 
        success: true, 
        message: `Market resolved successfully with outcome: ${winningOutcome}` 
      }
    } catch (error) {
      console.error("Error resolving market:", error)
      return { 
        success: false, 
        error: `Failed to resolve market: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }

  } catch (error) {
    console.error("Error syncing Polymarket resolution:", error)
    return { 
      success: false, 
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

