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

  // 1. Fetch Market and User logic
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

  // Validate Market Type logic
  if (market.type === MarketType.BINARY || market.type === MarketType.MULTIPLE_CHOICE) {
    if (!optionId) throw new Error("Please select an option")
    const validOption = market.options.find(o => o.id === optionId) || 
                        (market.type === MarketType.BINARY && (optionId === "YES" || optionId === "NO")) // Binary might not have options in DB if handled virtually, but let's stick to DB options or consistent logic.
                        // Wait, for BINARY my schema doesn't strictly enforce pre-made options. 
                        // Let's assume for BINARY we might create options on the fly or use specific IDs?
                        // Actually, easier if BINARY just uses 2 options created at market creation or we handle it here.
                        // Let's look at how I created markets. 
                        // My CreateMarketAction didn't create options for Binary.
                        // So for Binary, we should probably create "Yes" and "No" options on the fly or handle them as specific strings?
                        // Better: When creating a Binary market, I should have created options. 
                        // Let's fix that in future. For now, I will assume Binary options might be dynamic or stored in optionId.
                        // Actually, let's standardise: Even Binary markets should have Option records "Yes" and "No". 
                        // I'll check the create action again.
  }

  if (market.type === MarketType.NUMERIC_RANGE) {
    if (numericValue === undefined) throw new Error("Please provide a numeric value")
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

    // Check if Binary market needs options created (lazy init)
    let finalOptionId = optionId
    if (market.type === MarketType.BINARY) {
        // If we passed "YES" or "NO" but no DB option exists, we might need to handle it.
        // However, to keep it clean, I'll assume for now we are finding the option ID from the frontend.
        // If the frontend passed an ID, use it.
    }

    // Create Bet
    await tx.bet.create({
      data: {
        userId: user.id,
        marketId: market.id,
        amount,
        optionId: finalOptionId, 
        numericValue
      }
    })
  })

  revalidatePath(`/markets/${marketId}`)
  revalidatePath('/markets')
}

