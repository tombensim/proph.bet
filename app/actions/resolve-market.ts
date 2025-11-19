"use server"

import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { TransactionType, MarketType, MarketStatus, NotificationType } from "@prisma/client"
import { createNotification } from "@/lib/notifications"

const resolveSchema = z.object({
  marketId: z.string(),
  winningOptionId: z.string().optional(),
  winningValue: z.number().optional(),
  resolutionImage: z.string().optional(),
})

export async function resolveMarketAction(data: z.infer<typeof resolveSchema>) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const { marketId, winningOptionId, winningValue, resolutionImage } = data

  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: { 
      bets: true,
      options: true,
      hiddenUsers: true
    }
  })

  if (!market) throw new Error("Market not found")
  
  const isAdmin = session.user.role === "ADMIN";
  
  if (market.creatorId !== session.user.id && !isAdmin) {
      throw new Error("Only the creator can resolve this market")
  }
  if (market.status === "RESOLVED") throw new Error("Already resolved")
  
  const arenaId = market.arenaId
  if (!arenaId) throw new Error("Market configuration error: No Arena ID")

  // 1. Calculate Payouts and Updates (Atomic Transaction)
  const resolutionResult = await prisma.$transaction(async (tx) => {
    
    // @ts-ignore
    let winningBets: any[] = []
    let totalPayoutPool = 0
    let totalWinningWeight = 0 // shares for AMM, amount for Numeric
    const payouts = new Map<string, number>()

    // Determine Pool and Winners
    if (market.type === MarketType.BINARY || market.type === MarketType.MULTIPLE_CHOICE) {
       if (!winningOptionId) throw new Error("Must select a winning option")
       
       // AMM Payout: Pool is the sum of all option liquidities
       totalPayoutPool = market.options.reduce((sum, opt) => sum + opt.liquidity, 0)
       
       winningBets = market.bets.filter(b => b.optionId === winningOptionId)
       totalWinningWeight = winningBets.reduce((sum, b) => sum + b.shares, 0)
       
    } else if (market.type === MarketType.NUMERIC_RANGE) {
       if (winningValue === undefined) throw new Error("Must provide winning value")
       
       // Numeric Payout: Pool is sum of all bet amounts (Parimutuel)
       totalPayoutPool = market.bets.reduce((sum, bet) => sum + bet.amount, 0)
       
       // Find the closest difference
       const betsWithDiff = market.bets.map(b => ({
         ...b,
         diff: Math.abs((b.numericValue ?? 0) - winningValue)
       }))
       
       const minDiff = Math.min(...betsWithDiff.map(b => b.diff))
       winningBets = betsWithDiff.filter(b => b.diff === minDiff)
       totalWinningWeight = winningBets.reduce((sum, b) => sum + b.amount, 0) // Weight by amount for numeric
    }

    // Distribute Winnings
    if (winningBets.length > 0 && totalWinningWeight > 0) {
      for (const bet of winningBets) {
        // Calculate share of the pot
        const weight = (market.type === MarketType.NUMERIC_RANGE) ? bet.amount : bet.shares
        const share = weight / totalWinningWeight
        const payout = Math.floor(share * totalPayoutPool)

        if (payout > 0) {
          // Track payout for notifications
          const currentPayout = payouts.get(bet.userId) || 0
          payouts.set(bet.userId, currentPayout + payout)

          // Find membership to credit
          const membership = await tx.arenaMembership.findUnique({
            where: { 
              userId_arenaId: { 
                userId: bet.userId, 
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
                toUserId: bet.userId,
                marketId: market.id,
                arenaId
              }
            })
          }
        }
      }
    }

    // Close Market and Save Evidence
    await tx.market.update({
      where: { id: market.id },
      data: { 
        status: MarketStatus.RESOLVED,
        resolutionImage: resolutionImage,
        winningOptionId: winningOptionId,
        winningValue: winningValue
      }
    })

    return { payouts }
  })

  // 2. Send Notifications (Post-Transaction)
  const winningOptionName = market.options.find(o => o.id === winningOptionId)?.text || winningValue?.toString() || "Resolved"

  // Group bets by user to send one notification per user
  const userBets = new Map<string, typeof market.bets>()
  market.bets.forEach(bet => {
    const existing = userBets.get(bet.userId) || []
    userBets.set(bet.userId, [...existing, bet])
  })

  // Notify Bettors (BET_RESOLVED)
  for (const [userId, bets] of userBets.entries()) {
    const profit = resolutionResult.payouts.get(userId) || 0
    // Net result calculation could be more complex if multiple bets, but for now just check if they got a payout
    // Or should we compare total wagered vs total payout? 
    // The prompt implies "Position Closed" -> "BET_RESOLVED"
    
    const outcome = profit > 0 ? "WON" : "LOST"
    
    await createNotification({
      userId,
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
        outcome,
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

  revalidatePath(`/arenas/${arenaId}/markets/${marketId}`)
  revalidatePath(`/arenas/${arenaId}/markets`)
}
