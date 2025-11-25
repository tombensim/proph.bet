import { prisma } from "@/lib/prisma"
import { ResetFrequency, WinnerRule, NotificationType } from "@prisma/client"
import { NextResponse } from "next/server"
import { fetchPolymarketMarketById } from "@/lib/polymarket-service"

export const dynamic = 'force-dynamic'

/**
 * Daily cron job that handles:
 * 1. Arena resets (monthly/weekly point resets)
 * 2. Polymarket resolution syncing
 */
export async function GET(req: Request) {
  // Verify Cron Secret (if configured)
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const results = {
    timestamp: new Date().toISOString(),
    arenaReset: { success: true, arenas: [] as any[] },
    polymarketSync: { success: true, resolved: [] as any[], notReady: [] as any[], errors: [] as any[] }
  }

  // ============================================
  // PART 1: Arena Resets
  // ============================================
  try {
    const now = new Date()

    const arenasToReset = await prisma.arena.findMany({
      where: {
        settings: {
          nextResetDate: {
            lte: now
          }
        }
      },
      select: {
        id: true,
        name: true,
        settings: true,
        members: true
      }
    })

    for (const arena of arenasToReset) {
      if (!arena.settings) continue
      const settings = arena.settings

      try {
        await prisma.$transaction(async (tx) => {
          // A. Determine Winner
          let winnerId = null
          let winnerValue = 0

          if (settings.winnerRule === WinnerRule.HIGHEST_BALANCE) {
            const winner = await tx.arenaMembership.findFirst({
              where: { arenaId: arena.id },
              orderBy: { points: 'desc' }
            })
            if (winner) {
              winnerId = winner.userId
              winnerValue = winner.points
            }
          }

          // B. Announce Winner
          if (winnerId) {
            await tx.notification.create({
              data: {
                userId: winnerId,
                type: NotificationType.MONTHLY_WINNER,
                content: `Congratulations! You won the ${arena.name} cycle with ${winnerValue} points!`,
              }
            })
          }

          // C. Reset Points
          if (!settings.allowCarryover) {
            await tx.arenaMembership.updateMany({
              where: { arenaId: arena.id },
              data: { points: settings.monthlyAllocation ?? 1000 }
            })
          } else {
            await tx.arenaMembership.updateMany({
              where: { arenaId: arena.id },
              data: { points: { increment: settings.monthlyAllocation ?? 1000 } }
            })
          }

          // D. Update Next Reset Date
          const baseDate = settings.nextResetDate ? new Date(settings.nextResetDate) : new Date(now)
          let nextDate = new Date(baseDate)

          if (settings.resetFrequency === ResetFrequency.MONTHLY) {
            nextDate.setMonth(nextDate.getMonth() + 1)
            nextDate.setDate(1)
            nextDate.setHours(0, 0, 0, 0)
          } else if (settings.resetFrequency === ResetFrequency.WEEKLY) {
            nextDate.setDate(nextDate.getDate() + 7)
          } else {
            nextDate = new Date(now.getFullYear() + 100, 0, 1)
          }

          if (settings.resetFrequency === ResetFrequency.MANUAL) {
            await tx.arenaSettings.update({
              where: { id: settings.id },
              data: { nextResetDate: null }
            })
          } else {
            await tx.arenaSettings.update({
              where: { id: settings.id },
              data: { nextResetDate: nextDate }
            })
          }
        })

        results.arenaReset.arenas.push({ arena: arena.name, status: "success" })
      } catch (error) {
        console.error(`Failed to reset arena ${arena.id}`, error)
        results.arenaReset.arenas.push({ arena: arena.name, status: "failed", error: String(error) })
      }
    }
  } catch (error) {
    console.error("Arena reset failed:", error)
    results.arenaReset.success = false
  }

  // ============================================
  // PART 2: Polymarket Resolution Sync
  // ============================================
  try {
    // Find all unresolved Polymarket markets
    const markets = await prisma.market.findMany({
      where: {
        source: "POLYMARKET",
        status: { not: "RESOLVED" },
        polymarketId: { not: null }
      },
      include: {
        options: true
      }
    })

    console.log(`Found ${markets.length} unresolved Polymarket markets to check`)

    for (const market of markets) {
      try {
        if (!market.polymarketId) continue

        // Fetch current data from Polymarket
        const polymarketData = await fetchPolymarketMarketById(market.polymarketId)

        if (!polymarketData) {
          results.polymarketSync.errors.push({
            marketId: market.id,
            title: market.title,
            error: "Could not fetch from Polymarket"
          })
          continue
        }

        // Check if closed on Polymarket
        if (!polymarketData.closed) {
          results.polymarketSync.notReady.push({
            marketId: market.id,
            title: market.title,
            reason: "Not yet closed on Polymarket"
          })
          continue
        }

        // Determine winning outcome from prices
        let winningOutcome: string | null = null
        try {
          const outcomes = JSON.parse(polymarketData.outcomes)
          const prices = JSON.parse(polymarketData.outcomePrices).map((p: string) => parseFloat(p))

          let maxPrice = 0
          let maxPriceIndex = -1

          prices.forEach((price: number, index: number) => {
            if (price > maxPrice) {
              maxPrice = price
              maxPriceIndex = index
            }
          })

          // Consider resolved if highest price > 95%
          if (maxPrice > 0.95 && maxPriceIndex >= 0) {
            winningOutcome = outcomes[maxPriceIndex]
          }
        } catch (e) {
          results.polymarketSync.errors.push({
            marketId: market.id,
            title: market.title,
            error: "Failed to parse outcome data"
          })
          continue
        }

        if (!winningOutcome) {
          results.polymarketSync.notReady.push({
            marketId: market.id,
            title: market.title,
            reason: "Closed but resolution not yet clear"
          })
          continue
        }

        // Map winning outcome to local option
        const winningOption = market.options.find(
          opt => opt.text.toLowerCase() === winningOutcome!.toLowerCase()
        )

        if (!winningOption) {
          results.polymarketSync.errors.push({
            marketId: market.id,
            title: market.title,
            error: `Could not map outcome "${winningOutcome}" to local options`
          })
          continue
        }

        // Resolve the market (inline resolution to avoid auth issues in cron context)
        await resolveMarketDirectly(market.id, winningOption.id)

        results.polymarketSync.resolved.push({
          marketId: market.id,
          title: market.title,
          outcome: winningOutcome
        })

      } catch (error) {
        console.error(`Error processing market ${market.id}:`, error)
        results.polymarketSync.errors.push({
          marketId: market.id,
          title: market.title,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
  } catch (error) {
    console.error("Polymarket sync failed:", error)
    results.polymarketSync.success = false
  }

  console.log('Daily cron summary:', JSON.stringify(results, null, 2))

  return NextResponse.json({
    success: results.arenaReset.success && results.polymarketSync.success,
    ...results
  })
}

/**
 * Direct market resolution without auth (for cron context)
 * Simplified version of resolveMarketAction
 */
async function resolveMarketDirectly(marketId: string, winningOptionId: string) {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: {
      bets: true,
      options: true
    }
  })

  if (!market) throw new Error("Market not found")
  if (market.status === "RESOLVED") throw new Error("Already resolved")

  const arenaId = market.arenaId
  if (!arenaId) throw new Error("No Arena ID")

  await prisma.$transaction(async (tx) => {
    // Calculate payouts (AMM style)
    const totalPayoutPool = market.options.reduce((sum, opt) => sum + opt.liquidity, 0)
    const winningBets = market.bets.filter(b => b.optionId === winningOptionId)
    const totalWinningShares = winningBets.reduce((sum, b) => sum + b.shares, 0)

    const payouts = new Map<string, number>()

    if (totalWinningShares > 0) {
      for (const bet of winningBets) {
        const payout = Math.floor((bet.shares / totalWinningShares) * totalPayoutPool)
        const currentPayout = payouts.get(bet.userId) || 0
        payouts.set(bet.userId, currentPayout + payout)
      }
    }

    // Update market status
    await tx.market.update({
      where: { id: marketId },
      data: {
        status: "RESOLVED",
        winningOptionId
      }
    })

    // Distribute payouts
    for (const [userId, amount] of payouts) {
      await tx.arenaMembership.update({
        where: { userId_arenaId: { userId, arenaId } },
        data: { points: { increment: amount } }
      })

      await tx.transaction.create({
        data: {
          amount,
          type: "WIN_PAYOUT",
          toUserId: userId,
          marketId,
          arenaId
        }
      })
    }
  })
}

