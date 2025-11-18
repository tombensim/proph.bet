"use server"

import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { TransactionType, MarketType } from "@prisma/client"

const placeBetSchema = z.object({
  marketId: z.string(),
  amount: z.number().int().positive("Bet amount must be positive"),
  optionId: z.string().optional(), // For Binary/Multiple Choice
  numericValue: z.number().optional(), // For Numeric
})

export type PlaceBetValues = z.infer<typeof placeBetSchema>

export async function placeBetAction(data: PlaceBetValues) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const validated = placeBetSchema.safeParse(data)
  if (!validated.success) {
    throw new Error("Invalid data")
  }

  const { marketId, amount, optionId, numericValue } = validated.data

  // 1. Fetch Market and Options
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: { options: true }
  })

  if (!market) throw new Error("Market not found")
  if (market.status !== "OPEN") throw new Error("Market is closed")
  if (new Date() > market.resolutionDate) throw new Error("Market has expired")

  // Validate bet limits
  if (market.minBet && amount < market.minBet) throw new Error(`Minimum bet is ${market.minBet}`)
  if (market.maxBet && amount > market.maxBet) throw new Error(`Maximum bet is ${market.maxBet}`)

  // AMM Logic requires Options
  if (market.type === MarketType.NUMERIC_RANGE) {
     if (numericValue === undefined) throw new Error("Please provide a numeric value")
  } else {
     if (!optionId) throw new Error("Please select an option")
  }

  // 2. Execute Transaction
  await prisma.$transaction(async (tx) => {
    // Get fresh user balance
    const user = await tx.user.findUniqueOrThrow({
      where: { id: session.user!.id }
    })

    if (user.points < amount) {
      throw new Error(`Insufficient points. You have ${user.points}.`)
    }

    // Deduct points
    await tx.user.update({
      where: { id: user.id },
      data: { points: { decrement: amount } }
    })

    // Create Transaction Record
    await tx.transaction.create({
      data: {
        amount: amount,
        type: TransactionType.BET_PLACED,
        fromUserId: user.id,
      }
    })

    // CPMM Logic
    let shares = 0;
    let finalOptionId = optionId;

    if ((market.type === MarketType.BINARY || market.type === MarketType.MULTIPLE_CHOICE) && optionId && market.options.length > 0) {
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
                data: { liquidity: { increment: amount } }
            })
        }

        // Calculate new target liquidity
        const newOtherProduct = otherOptions.reduce((acc, o) => acc * (o.liquidity + amount), 1)
        const newTargetLiquidity = k / newOtherProduct

        // Update target pool
        await tx.option.update({
            where: { id: targetOption.id },
            data: { liquidity: newTargetLiquidity }
        })

        // Calculate Shares
        const swappedShares = targetOption.liquidity - newTargetLiquidity
        shares = amount + swappedShares

        // --- RECORD PRICE HISTORY ---
        // Fetch fresh state to record accurate prices
        const updatedOptions = await tx.option.findMany({
            where: { marketId: market.id }
        })

        // Calculate implied probability for each option: (1/Liq) / Sum(1/Liq)
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
        shares = amount 
    }

    // Create Bet
    await tx.bet.create({
      data: {
        userId: user.id,
        marketId: market.id,
        amount,
        shares: shares, // Store calculated shares
        optionId: finalOptionId, 
        numericValue
      }
    })
  })

  revalidatePath(`/markets/${marketId}`)
  revalidatePath('/markets')
}
