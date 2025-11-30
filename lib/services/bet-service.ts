import { prisma } from "@/lib/prisma"
import { Prisma, TransactionType, MarketType } from "@prisma/client"
import { analyzeMarketSentiment } from "@/app/actions/analyze-sentiment"

export interface PlaceBetParams {
  userId: string
  marketId: string
  amount: number
  optionId?: string
  numericValue?: number
  idempotencyKey?: string
}

export interface PlaceBetResult {
  success: boolean
  betId?: string
  shares?: number
  error?: string
}

/**
 * Core bet placement logic - used by both server actions and API routes
 */
export async function placeBet(params: PlaceBetParams): Promise<PlaceBetResult> {
  const { userId, marketId, amount, optionId, numericValue, idempotencyKey } = params

  // 1. Fetch Market and Options
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: { options: true }
  })

  if (!market) throw new Error("Market not found")
  if (market.status !== "OPEN") throw new Error("Market is closed")
  if (new Date() > market.resolutionDate) throw new Error("Market has expired")
  if (!market.arenaId) throw new Error("Market configuration error: No Arena ID")

  // Validate bet limits
  if (market.minBet && amount < market.minBet) throw new Error(`Minimum bet is ${market.minBet}`)
  if (market.maxBet && amount > market.maxBet) throw new Error(`Maximum bet is ${market.maxBet}`)

  // AMM Logic requires Options
  if (market.type === MarketType.NUMERIC_RANGE && market.options.length > 0) {
    if (!optionId) throw new Error("Please select a range")
  } else if (market.type === MarketType.NUMERIC_RANGE) {
    if (numericValue === undefined) throw new Error("Please provide a numeric value")
  } else {
    if (!optionId) throw new Error("Please select an option")
  }

  const arenaId = market.arenaId
  let betId: string | undefined
  let shares = 0

  try {
    // 2. Execute Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get user arena membership
      const membership = await tx.arenaMembership.findUnique({
        where: {
          userId_arenaId: {
            userId,
            arenaId
          }
        }
      })

      if (!membership) {
        throw new Error("You are not a member of this arena")
      }

      // --- CHECK RESTRICTIONS ---
      const arenaSettings = await tx.arenaSettings.findUnique({ where: { arenaId } })

      // Check limitMultipleBets restriction
      if (arenaSettings?.limitMultipleBets) {
        const existingBet = await tx.transaction.findFirst({
          where: {
            marketId: market.id,
            fromUserId: userId,
            type: TransactionType.BET_PLACED
          }
        })

        if (existingBet) {
          const uniqueBettors = await tx.bet.groupBy({
            by: ['userId'],
            where: {
              marketId: market.id,
              userId: { not: userId }
            }
          })

          const threshold = arenaSettings.multiBetThreshold ?? 3
          if (uniqueBettors.length < threshold) {
            throw new Error(`You can only place additional bets after at least ${threshold} other members have bet on this market. Currently: ${uniqueBettors.length}`)
          }
        }
      }

      if (membership.points < amount) {
        throw new Error(`Insufficient points. You have ${membership.points}.`)
      }

      // Deduct points from arena membership
      await tx.arenaMembership.update({
        where: { id: membership.id },
        data: { points: { decrement: amount } }
      })

      // Create Transaction Record
      await tx.transaction.create({
        data: {
          amount: amount,
          type: TransactionType.BET_PLACED,
          fromUserId: userId,
          marketId: market.id,
          arenaId
        }
      })

      // --- FEE LOGIC ---
      const FEE_PERCENT = (arenaSettings?.tradingFeePercent ?? 0) / 100
      const fee = Math.floor(amount * FEE_PERCENT)
      const netBetAmount = amount - fee

      if (fee > 0) {
        const creatorMembership = await tx.arenaMembership.findUnique({
          where: {
            userId_arenaId: {
              userId: market.creatorId,
              arenaId
            }
          }
        })

        if (creatorMembership) {
          await tx.arenaMembership.update({
            where: { id: creatorMembership.id },
            data: { points: { increment: fee } }
          })
        }
      }

      // CPMM Logic
      let calculatedShares = 0
      const finalOptionId = optionId

      if ((market.type === MarketType.BINARY || market.type === MarketType.MULTIPLE_CHOICE || (market.type === MarketType.NUMERIC_RANGE && market.options.length > 0)) && optionId && market.options.length > 0) {
        const options = await tx.option.findMany({
          where: { marketId: market.id }
        })

        const targetOption = options.find(o => o.id === optionId)
        if (!targetOption) throw new Error("Option not found")

        // Calculate k (product of all pools)
        const poolBalances = options.map(o => o.liquidity)
        const k = poolBalances.reduce((acc, val) => acc * val, 1)

        const otherOptions = options.filter(o => o.id !== optionId)

        // Update other pools
        for (const other of otherOptions) {
          await tx.option.update({
            where: { id: other.id },
            data: { liquidity: { increment: netBetAmount } }
          })
        }

        // Calculate new target liquidity
        const newOtherProduct = otherOptions.reduce((acc, o) => acc * (o.liquidity + netBetAmount), 1)
        const newTargetLiquidity = k / newOtherProduct

        // Update target pool
        await tx.option.update({
          where: { id: targetOption.id },
          data: { liquidity: newTargetLiquidity }
        })

        // Calculate Shares
        const swappedShares = targetOption.liquidity - newTargetLiquidity
        calculatedShares = netBetAmount + swappedShares

        // --- RECORD PRICE HISTORY ---
        const updatedOptions = await tx.option.findMany({
          where: { marketId: market.id }
        })

        const inverseSum = updatedOptions.reduce((sum, o) => sum + (1 / o.liquidity), 0)
        const batchTimestamp = new Date()

        for (const opt of updatedOptions) {
          const probability = (1 / opt.liquidity) / inverseSum

          await tx.priceHistory.create({
            data: {
              marketId: market.id,
              optionId: opt.id,
              price: probability,
              createdAt: batchTimestamp
            }
          })
        }

      } else if (market.type === MarketType.NUMERIC_RANGE) {
        calculatedShares = netBetAmount
      }

      // Create Bet
      const bet = await tx.bet.create({
        data: {
          userId,
          marketId: market.id,
          amount: netBetAmount,
          shares: calculatedShares,
          optionId: finalOptionId,
          numericValue,
          idempotencyKey
        }
      })

      return { betId: bet.id, shares: calculatedShares }
    })

    betId = result.betId
    shares = result.shares
  } catch (error) {
    // Handle idempotency violation gracefully
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = error.meta?.target
      if (Array.isArray(target) && target.includes('idempotencyKey') || target === 'idempotencyKey') {
        // Return success as it was already processed
        return { success: true }
      }
    }
    throw error
  }

  // Trigger Analyst Sentiment (fire and forget - non-blocking)
  const optionText = optionId ? market.options.find(o => o.id === optionId)?.text : numericValue
  const triggerText = `User placed a bet of ${amount} on "${optionText || 'Unknown'}"`

  // Do NOT await this call
  analyzeMarketSentiment({
    marketId: market.id,
    triggerEvent: triggerText
  }).catch(err => {
    console.error("Failed to trigger analyst sentiment in background:", err)
  })

  return { success: true, betId, shares }
}
