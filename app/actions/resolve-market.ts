"use server"

import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { TransactionType, MarketType, MarketStatus } from "@prisma/client"

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
      options: true 
    }
  })

  if (!market) throw new Error("Market not found")
  if (market.creatorId !== session.user.id && session.user.role !== "ADMIN") {
      throw new Error("Only the creator can resolve this market")
  }
  if (market.status === "RESOLVED") throw new Error("Already resolved")

  // Payout Logic
  await prisma.$transaction(async (tx) => {
    
    let winningBets = []
    let totalPayoutPool = 0
    let totalWinningWeight = 0 // shares for AMM, amount for Numeric

    // 1. Determine Pool and Winners
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

    // 2. Distribute Winnings
    if (winningBets.length > 0 && totalWinningWeight > 0) {
      for (const bet of winningBets) {
        // Calculate share of the pot
        const weight = (market.type === MarketType.NUMERIC_RANGE) ? bet.amount : bet.shares
        const share = weight / totalWinningWeight
        const payout = Math.floor(share * totalPayoutPool)

        if (payout > 0) {
          await tx.user.update({
             where: { id: bet.userId },
             data: { points: { increment: payout } }
          })

          await tx.transaction.create({
            data: {
              amount: payout,
              type: TransactionType.WIN_PAYOUT,
              toUserId: bet.userId,
              marketId: market.id
            }
          })
          
          // Notify user (optional, but good practice)
          await tx.notification.create({
            data: {
              userId: bet.userId,
              type: "WIN_PAYOUT",
              content: `You won ${payout} points on market: ${market.title}`
            }
          })
        }
      }
    }

    // 3. Close Market and Save Evidence
    await tx.market.update({
      where: { id: market.id },
      data: { 
        status: MarketStatus.RESOLVED,
        resolutionImage: resolutionImage,
        winningOptionId: winningOptionId,
        winningValue: winningValue
      }
    })
  })

  revalidatePath(`/markets/${marketId}`)
}
