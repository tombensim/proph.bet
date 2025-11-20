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
    // Helper to track the determined winning option for Numeric markets
    let determinedWinningOptionId = winningOptionId

    if (market.type === MarketType.BINARY || market.type === MarketType.MULTIPLE_CHOICE) {
       if (!winningOptionId) throw new Error("Must select a winning option")
       
       // AMM Payout: Pool is the sum of all option liquidities
       totalPayoutPool = market.options.reduce((sum, opt) => sum + opt.liquidity, 0)
       
       winningBets = market.bets.filter(b => b.optionId === winningOptionId)
       totalWinningWeight = winningBets.reduce((sum, b) => sum + b.shares, 0)
       
    } else if (market.type === MarketType.NUMERIC_RANGE) {
       if (winningValue === undefined) throw new Error("Must provide winning value")
       
       if (market.options.length > 0) {
           // New Bucketed Logic
           const sortedOptions = [...market.options].sort((a, b) => {
                const minA = parseFloat(a.text.split(" - ")[0])
                const minB = parseFloat(b.text.split(" - ")[0])
                return minA - minB
            })

            for (let i = 0; i < sortedOptions.length; i++) {
                const opt = sortedOptions[i];
                const parts = opt.text.split(" - ")
                // Attempt to parse range
                if (parts.length === 2) {
                    const min = parseFloat(parts[0])
                    const max = parseFloat(parts[1])
                    
                    const isLast = i === sortedOptions.length - 1;
                    // Check bounds: [min, max) generally, but [min, max] for last bucket
                    if (winningValue >= min && (winningValue < max || (isLast && winningValue <= max))) {
                         determinedWinningOptionId = opt.id;
                         break;
                    }
                }
            }

            if (!determinedWinningOptionId) {
                 // Fallback: if out of bounds, maybe invalid? 
                 // Or maybe the value is just outside range. 
                 // For now, let's throw if we can't map it, or handle "out of range" if we had an "Other" bucket.
                 // But we don't have "Other".
                 throw new Error(`Value ${winningValue} does not fall into any bucket`)
            }

           // AMM Payout Logic (Same as Multiple Choice)
           totalPayoutPool = market.options.reduce((sum, opt) => sum + opt.liquidity, 0)
           winningBets = market.bets.filter(b => b.optionId === determinedWinningOptionId)
           totalWinningWeight = winningBets.reduce((sum, b) => sum + b.shares, 0)

       } else {
           // Old Numeric Logic (Parimutuel)
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
    }

    // Distribute Winnings
    if (winningBets.length > 0 && totalWinningWeight > 0) {
      for (const bet of winningBets) {
        // Calculate share of the pot
        // If it's the NEW numeric type (with options), we use shares (AMM). 
        // If OLD numeric type (no options), we use amount.
        const isAmm = (market.type === MarketType.NUMERIC_RANGE && market.options.length > 0) || market.type !== MarketType.NUMERIC_RANGE
        const weight = isAmm ? bet.shares : bet.amount
        
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
        winningOptionId: determinedWinningOptionId,
        winningValue: winningValue
      }
    })

    return { payouts, winningOptionId: determinedWinningOptionId }
  })

  // 2. Send Notifications (Post-Transaction)
  const finalWinningId = resolutionResult.winningOptionId
  const winningOptionName = market.options.find(o => o.id === finalWinningId)?.text || winningValue?.toString() || "Resolved"

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
