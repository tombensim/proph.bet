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
    const totalPool = market.bets.reduce((sum, bet) => sum + bet.amount, 0)

    // 1. Identify Winners
    if (market.type === MarketType.BINARY || market.type === MarketType.MULTIPLE_CHOICE) {
       if (!winningOptionId) throw new Error("Must select a winning option")
       winningBets = market.bets.filter(b => b.optionId === winningOptionId)
    } else if (market.type === MarketType.NUMERIC_RANGE) {
       if (winningValue === undefined) throw new Error("Must provide winning value")
       
       // Find the closest difference
       const betsWithDiff = market.bets.map(b => ({
         ...b,
         diff: Math.abs((b.numericValue ?? 0) - winningValue)
       }))
       
       const minDiff = Math.min(...betsWithDiff.map(b => b.diff))
       winningBets = betsWithDiff.filter(b => b.diff === minDiff)
    }

    // 2. Distribute Winnings
    const totalWinningBetAmount = winningBets.reduce((sum, b) => sum + b.amount, 0)

    if (totalWinningBetAmount > 0) {
      for (const bet of winningBets) {
        const share = bet.amount / totalWinningBetAmount
        const payout = Math.floor(share * totalPool)

        if (payout > 0) {
          await tx.user.update({
             where: { id: bet.userId },
             data: { points: { increment: payout } }
          })

          await tx.transaction.create({
            data: {
              amount: payout,
              type: TransactionType.WIN_PAYOUT,
              toUserId: bet.userId
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
        resolutionImage: resolutionImage
      }
    })
  })

  revalidatePath(`/markets/${marketId}`)
}
