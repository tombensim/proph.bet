"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { MarketType } from "@prisma/client"
import { fetchPolymarketMarkets as fetchService, type PolymarketMarket, type PolymarketFilter } from "@/lib/polymarket-service"

// Re-export types for frontend
export type { PolymarketMarket, PolymarketFilter }

// Wrapper for Server Action to include caching/revalidation if needed, 
// though the service currently does the fetch. 
// We can just expose the service function as a server action or wrap it.
export async function fetchPolymarketMarkets(filter: PolymarketFilter = {}) {
  // We can add specific Next.js caching logic here if we move the fetch out of the shared service
  // Or just call the service.
  return await fetchService(filter)
}

export async function importPolymarketMarket(
  marketData: PolymarketMarket, 
  arenaId: string, 
  categoryOverride?: string
) {
  const session = await auth()
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  // 1. Check Permissions (Admin of Arena or Global Admin)
  const membership = await prisma.arenaMembership.findUnique({
    where: { userId_arenaId: { userId: session.user.id, arenaId } }
  })
  
  if (!membership) {
    throw new Error("You must be a member of the arena to import markets")
  }

  const isGlobalAdmin = session.user.role === "ADMIN" || session.user.role === "GLOBAL_ADMIN"
  const isArenaAdmin = membership.role === "ADMIN"

  if (!isGlobalAdmin && !isArenaAdmin) {
    throw new Error("Only arena admins can import markets")
  }

  // 2. Check if already imported
  const existing = await prisma.market.findUnique({
    where: { polymarketId: marketData.id }
  })

  if (existing) {
    throw new Error("This market has already been imported")
  }

  // 3. Get Arena Settings for Seed Liquidity
  const arenaSettings = await prisma.arenaSettings.findUnique({
    where: { arenaId }
  })
  const SEED_AMOUNT = arenaSettings?.seedLiquidity ?? 100

  // 4. Parse Outcomes and Prices
  let outcomes: string[] = []
  let prices: number[] = []
  try {
    outcomes = JSON.parse(marketData.outcomes)
    prices = JSON.parse(marketData.outcomePrices).map((p: string) => parseFloat(p))
  } catch (e) {
    throw new Error("Failed to parse Polymarket outcomes/prices")
  }

  if (outcomes.length !== 2) {
    // For now, only support Binary markets comfortably or ensure logic handles Multi
  }

  // 5. Calculate Initial Liquidity Distribution
  // Target: P(A) = Pool_B / (Pool_A + Pool_B)
  const isBinary = outcomes.length === 2 && outcomes.includes("Yes") && outcomes.includes("No")
  
  const optionsToCreate = outcomes.map((text, idx) => {
    const price = prices[idx] || (1 / outcomes.length)
    let liquidity = SEED_AMOUNT // Default equal
    
    if (isBinary) {
      // Invert logic: Liquidity for this option is proportional to probability of OTHER option.
      liquidity = (SEED_AMOUNT * 2) * (1 - price)
    }
    
    return {
      text,
      liquidity
    }
  })

  const calculatedTotalCost = optionsToCreate.reduce((sum, opt) => sum + opt.liquidity, 0)

  // 6. Transaction to create market
  await prisma.$transaction(async (tx) => {
    // Check balance
    if (membership.points < calculatedTotalCost) {
      throw new Error(`Insufficient points to import. Required: ${Math.ceil(calculatedTotalCost)}`)
    }

    // Deduct points
    await tx.arenaMembership.update({
      where: { id: membership.id },
      data: { points: { decrement: Math.ceil(calculatedTotalCost) } }
    })

    // Create Market
    const market = await tx.market.create({
      data: {
        title: marketData.question,
        description: marketData.description || `Imported from Polymarket. Source: ${marketData.id}`,
        type: MarketType.BINARY, // Assuming Binary for most imports
        resolutionDate: new Date(marketData.endDate),
        creatorId: session.user.id,
        arenaId,
        minBet: 5,
        maxBet: null,
        
        // Polymarket Specifics
        polymarketId: marketData.id,
        source: "POLYMARKET",
        
        options: {
          create: optionsToCreate.map(o => ({
            text: o.text,
            liquidity: o.liquidity
          }))
        },
        
        assets: marketData.image ? {
          create: [{
            type: "IMAGE",
            url: marketData.image,
            label: "Cover"
          }]
        } : undefined,

        approved: true, 
        language: "en"
      },
      include: { options: true }
    })

    // Issue initial LP shares to creator (Admin)
    for (const option of market.options) {
      await tx.bet.create({
        data: {
          userId: session.user.id,
          marketId: market.id,
          optionId: option.id,
          amount: Math.ceil(option.liquidity), // Int field
          shares: option.liquidity, // Float field
        }
      })
    }
  })

  revalidatePath(`/arenas/${arenaId}/markets`)
}
