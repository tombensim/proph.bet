import { prisma } from "@/lib/prisma"
import { MarketType, MarketStatus, TransactionType } from "@prisma/client"
import { createNotification } from "@/lib/notifications"
import { calculateResolutionPayouts, findWinningNumericBucket } from "@/lib/amm"

export interface CreateMarketParams {
  userId: string
  userRole: string
  title: string
  description?: string
  type: MarketType
  resolutionDate: Date
  options?: { value: string }[]
  minBet?: number
  maxBet?: number
  hiddenFromUserIds?: string[]
  hideBetsFromUserIds?: string[]
  arenaId: string
  assets?: { type: "IMAGE" | "LINK" | "FILE"; url: string; label?: string }[]
}

export interface CreateMarketResult {
  success: boolean
  marketId?: string
  error?: string
}

/**
 * Core market creation logic - used by both server actions and API routes
 */
export async function createMarket(params: CreateMarketParams): Promise<CreateMarketResult> {
  const {
    userId,
    userRole,
    title,
    description,
    type,
    resolutionDate,
    options,
    minBet,
    maxBet,
    hiddenFromUserIds,
    hideBetsFromUserIds,
    arenaId,
    assets
  } = params

  // 1. CHECK ARENA SETTINGS & PERMISSIONS
  const arenaSettings = await prisma.arenaSettings.findUnique({
    where: { arenaId }
  })

  const creationPolicy = arenaSettings?.creationPolicy ?? "EVERYONE"
  const SEED_AMOUNT = arenaSettings?.seedLiquidity ?? 100
  const requireApproval = arenaSettings?.requireApproval ?? false
  const defaultLanguage = arenaSettings?.defaultLanguage ?? "en"

  // Check Creation Policy
  if (creationPolicy === "ADMIN") {
    const membership = await prisma.arenaMembership.findUnique({
      where: { userId_arenaId: { userId, arenaId } }
    })
    const isGlobalAdmin = userRole === "ADMIN" || userRole === "GLOBAL_ADMIN"
    const isArenaAdmin = membership?.role === "ADMIN"

    if (!isGlobalAdmin && !isArenaAdmin) {
      throw new Error("Only admins can create markets in this arena")
    }
  }

  // 2. CALCULATE TOTAL COST
  let totalCost = 0
  if (type === MarketType.BINARY) {
    totalCost = SEED_AMOUNT * 2
  } else if ((type === MarketType.MULTIPLE_CHOICE || type === MarketType.NUMERIC_RANGE) && options) {
    totalCost = SEED_AMOUNT * options.length
  }

  // 3. CHECK & DEDUCT POINTS (Transaction)
  const result = await prisma.$transaction(async (tx) => {
    // Verify membership
    const membership = await tx.arenaMembership.findUnique({
      where: {
        userId_arenaId: {
          userId,
          arenaId
        }
      }
    })

    if (!membership) {
      throw new Error("Unauthorized: You are not a member of this arena")
    }

    if (totalCost > 0 && membership.points < totalCost) {
      throw new Error(`Insufficient points. You need ${totalCost} points to seed this market.`)
    }

    // Deduct cost
    if (totalCost > 0) {
      await tx.arenaMembership.update({
        where: { id: membership.id },
        data: { points: { decrement: totalCost } }
      })
    }

    const market = await tx.market.create({
      data: {
        title,
        description: description || "",
        type,
        resolutionDate,
        creatorId: userId,
        arenaId,
        minBet: minBet || null,
        maxBet: maxBet || null,
        options: (type === MarketType.MULTIPLE_CHOICE || type === MarketType.NUMERIC_RANGE) && options ? {
          create: options.map(o => ({
            text: o.value,
            liquidity: SEED_AMOUNT
          }))
        } : type === MarketType.BINARY ? {
          create: [{
            text: "Yes",
            liquidity: SEED_AMOUNT
          }, {
            text: "No",
            liquidity: SEED_AMOUNT
          }]
        } : undefined,
        hiddenUsers: hiddenFromUserIds && hiddenFromUserIds.length > 0 ? {
          connect: hiddenFromUserIds.map(id => ({ id }))
        } : undefined,
        hideBetsFromUsers: hideBetsFromUserIds && hideBetsFromUserIds.length > 0 ? {
          connect: hideBetsFromUserIds.map(id => ({ id }))
        } : undefined,
        assets: assets && assets.length > 0 ? {
          create: assets.map(a => ({
            type: a.type,
            url: a.url,
            label: a.label
          }))
        } : undefined,
        approved: !requireApproval,
        language: defaultLanguage
      },
      include: { options: true }
    })

    // 5. ISSUE "LP SHARES" (BETS) TO CREATOR
    if (totalCost > 0 && market.options.length > 0) {
      for (const option of market.options) {
        await tx.bet.create({
          data: {
            userId,
            marketId: market.id,
            optionId: option.id,
            amount: SEED_AMOUNT,
            shares: SEED_AMOUNT,
          }
        })
      }
    }

    return { marketId: market.id }
  })

  return { success: true, marketId: result.marketId }
}

export interface ResolveMarketParams {
  userId: string
  userRole: string
  marketId: string
  winningOptionId?: string
  winningValue?: number
  resolutionImage?: string
}

export interface ResolveMarketResult {
  success: boolean
  payouts: Map<string, number>
  winningOptionId?: string
}

/**
 * Core market resolution logic - used by both server actions and API routes
 */
export async function resolveMarket(params: ResolveMarketParams): Promise<ResolveMarketResult> {
  const { userId, userRole, marketId, winningOptionId, winningValue, resolutionImage } = params

  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: {
      bets: true,
      options: true,
      hiddenUsers: true
    }
  })

  if (!market) throw new Error("Market not found")

  const isAdmin = userRole === "ADMIN"

  if (market.creatorId !== userId && !isAdmin) {
    throw new Error("Only the creator can resolve this market")
  }
  if (market.status === "RESOLVED") throw new Error("Already resolved")

  const arenaId = market.arenaId
  if (!arenaId) throw new Error("Market configuration error: No Arena ID")

  // 1. Calculate Payouts and Updates (Atomic Transaction)
  const resolutionResult = await prisma.$transaction(async (tx) => {
    let winningBets: typeof market.bets = []
    let totalPayoutPool = 0
    let determinedWinningOptionId = winningOptionId

    if (market.type === MarketType.BINARY || market.type === MarketType.MULTIPLE_CHOICE) {
      if (!winningOptionId) throw new Error("Must select a winning option")

      totalPayoutPool = market.options.reduce((sum, opt) => sum + opt.liquidity, 0)
      winningBets = market.bets.filter(b => b.optionId === winningOptionId)

    } else if (market.type === MarketType.NUMERIC_RANGE) {
      if (winningValue === undefined) throw new Error("Must provide winning value")

      if (market.options.length > 0) {
        // Use AMM module to find winning bucket
        determinedWinningOptionId = findWinningNumericBucket(
          winningValue,
          market.options.map(o => ({ id: o.id, text: o.text }))
        )

        if (!determinedWinningOptionId) {
          throw new Error(`Value ${winningValue} does not fall into any bucket`)
        }

        totalPayoutPool = market.options.reduce((sum, opt) => sum + opt.liquidity, 0)
        winningBets = market.bets.filter(b => b.optionId === determinedWinningOptionId)

      } else {
        // Old Numeric Logic (Parimutuel - closest to winning value)
        totalPayoutPool = market.bets.reduce((sum, bet) => sum + bet.amount, 0)

        const betsWithDiff = market.bets.map(b => ({
          ...b,
          diff: Math.abs((b.numericValue ?? 0) - winningValue)
        }))

        const minDiff = Math.min(...betsWithDiff.map(b => b.diff))
        winningBets = betsWithDiff.filter(b => b.diff === minDiff)
      }
    }

    // Use AMM module for payout calculations
    const isAMM = (market.type === MarketType.NUMERIC_RANGE && market.options.length > 0) ||
                  market.type !== MarketType.NUMERIC_RANGE

    const payouts = calculateResolutionPayouts(
      totalPayoutPool,
      winningBets.map(b => ({
        userId: b.userId,
        shares: b.shares,
        amount: b.amount
      })),
      isAMM // Use shares for AMM markets, amounts for parimutuel
    )

    // Distribute Winnings
    for (const [betUserId, payout] of payouts.entries()) {
      if (payout > 0) {
        const membership = await tx.arenaMembership.findUnique({
          where: {
            userId_arenaId: {
              userId: betUserId,
              arenaId
            }
          }
        })

        if (membership) {
          await tx.arenaMembership.update({
            where: { id: membership.id },
            data: { points: { increment: payout } }
          })

          await tx.transaction.create({
            data: {
              amount: payout,
              type: TransactionType.WIN_PAYOUT,
              toUserId: betUserId,
              marketId: market.id,
              arenaId
            }
          })
        }
      }
    }

    // Close Market and Save Evidence
    await tx.market.update({
      where: { id: market.id },
      data: {
        status: MarketStatus.RESOLVED,
        resolutionImage: resolutionImage,
        winningOptionId: determinedWinningOptionId,
        winningValue: winningValue
      }
    })

    return { payouts, winningOptionId: determinedWinningOptionId }
  })

  // 2. Send Notifications (Post-Transaction)
  const finalWinningId = resolutionResult.winningOptionId
  const winningOptionName = market.options.find(o => o.id === finalWinningId)?.text || winningValue?.toString() || "Resolved"

  // Group bets by user
  const userBets = new Map<string, typeof market.bets>()
  market.bets.forEach(bet => {
    const existing = userBets.get(bet.userId) || []
    userBets.set(bet.userId, [...existing, bet])
  })

  // Notify Bettors (BET_RESOLVED)
  for (const [betUserId] of userBets.entries()) {
    const profit = resolutionResult.payouts.get(betUserId) || 0
    const outcome = profit > 0 ? "WON" : "LOST"

    await createNotification({
      userId: betUserId,
      type: "BET_RESOLVED",
      content: profit > 0
        ? `You won ${profit} points on market: ${market.title}`
        : `Your bet on ${market.title} has been resolved.`,
      arenaId,
      metadata: {
        marketId: market.id,
        outcome,
        payout: profit
      },
      emailData: {
        marketTitle: market.title,
        marketId: market.id,
        arenaId,
        outcome: outcome as "WON" | "LOST",
        profit
      }
    })
  }

  // Notify Creator (MARKET_RESOLVED)
  await createNotification({
    userId: market.creatorId,
    type: "MARKET_RESOLVED",
    content: `Your market "${market.title}" has been resolved.`,
    arenaId,
    metadata: {
      marketId: market.id,
      outcome: winningOptionName
    },
    emailData: {
      marketTitle: market.title,
      marketId: market.id,
      arenaId,
      winningOption: winningOptionName
    }
  })

  // Notify Hidden Users (MARKET_RESOLVED)
  for (const hiddenUser of market.hiddenUsers) {
    await createNotification({
      userId: hiddenUser.id,
      type: "MARKET_RESOLVED",
      content: `A hidden market you were part of "${market.title}" has been resolved.`,
      arenaId,
      metadata: {
        marketId: market.id,
        outcome: winningOptionName
      },
      emailData: {
        marketTitle: market.title,
        marketId: market.id,
        arenaId,
        winningOption: winningOptionName
      }
    })
  }

  return { success: true, payouts: resolutionResult.payouts, winningOptionId: resolutionResult.winningOptionId }
}

export interface GetMarketsParams {
  arenaId: string
  userId?: string
  status?: MarketStatus
  limit?: number
  offset?: number
}

/**
 * Get markets for an arena
 */
export async function getMarkets(params: GetMarketsParams) {
  const { arenaId, userId, status, limit = 50, offset = 0 } = params

  const markets = await prisma.market.findMany({
    where: {
      arenaId,
      ...(status && { status }),
      // Exclude markets hidden from this user
      ...(userId && {
        hiddenUsers: {
          none: { id: userId }
        }
      }),
      approved: true
    },
    include: {
      options: true,
      creator: {
        select: { id: true, name: true, image: true }
      },
      _count: {
        select: { bets: true, comments: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset
  })

  return markets
}

/**
 * Get a single market by ID
 */
export async function getMarket(marketId: string, userId?: string) {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: {
      options: true,
      creator: {
        select: { id: true, name: true, image: true }
      },
      bets: userId ? {
        where: { userId },
        include: { option: true }
      } : false,
      _count: {
        select: { bets: true, comments: true }
      },
      priceHistory: {
        orderBy: { createdAt: "desc" },
        take: 100
      }
    }
  })

  return market
}
