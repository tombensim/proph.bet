"use server"

import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Prisma, TransactionType, MarketType } from "@prisma/client"

const placeBetSchema = z.object({
  marketId: z.string(),
  amount: z.number().int().positive("Bet amount must be positive"),
  optionId: z.string().optional(), // For Binary/Multiple Choice
  numericValue: z.number().optional(), // For Numeric
  idempotencyKey: z.string().optional(),
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

  const { marketId, amount, optionId, numericValue, idempotencyKey } = validated.data

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

  try {
      // 2. Execute Transaction
      await prisma.$transaction(async (tx) => {
        // Check for idempotency within transaction to ensure consistency if possible, 
        // or rely on unique constraint which is safer for race conditions.
        // If we rely on unique constraint, we catch the error below.
        
        // Get user arena membership
        if (!session?.user?.id) throw new Error("Unauthorized")
        const membership = await tx.arenaMembership.findUnique({
          where: { 
            userId_arenaId: { 
              userId: session.user.id,
              arenaId
            } 
          }
        })
    
        if (!membership) {
          throw new Error("You are not a member of this arena")
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
            fromUserId: session.user.id,
            marketId: market.id,
            arenaId
          }
        })
    

    // --- FEE LOGIC ---
    const arenaSettings = await tx.arenaSettings.findUnique({ where: { arenaId } })

    // Check limitMultipleBets restriction
    if (arenaSettings?.limitMultipleBets) {
      const existingBet = await tx.bet.findFirst({
        where: {
          marketId: market.id,
          userId: session.user.id
        }
      })

      if (existingBet) {
        const uniqueBettors = await tx.bet.groupBy({
          by: ['userId'],
          where: {
            marketId: market.id,
            userId: { not: session.user.id }
          }
        })

        const threshold = arenaSettings.multiBetThreshold ?? 3
        if (uniqueBettors.length < threshold) {
           throw new Error(`You can only place additional bets after at least ${threshold} other members have bet on this market. Currently: ${uniqueBettors.length}`)
        }
      }
    }

    const FEE_PERCENT = (arenaSettings?.tradingFeePercent ?? 0) / 100
        const fee = Math.floor(amount * FEE_PERCENT)
        const netBetAmount = amount - fee
    
        if (fee > 0) {
          // Find creator's membership to credit fee
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
        let shares = 0;
        let finalOptionId = optionId;
    
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
            shares = netBetAmount + swappedShares
    
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
            shares = netBetAmount 
        }
    
        // Create Bet
        await tx.bet.create({
          data: {
            userId: session.user.id,
            marketId: market.id,
            amount: netBetAmount, // Store net amount
            shares: shares, // Store calculated shares
            optionId: finalOptionId, 
            numericValue,
            idempotencyKey
          }
        })
      })
  } catch (error) {
      // Handle idempotency violation gracefully
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const target = error.meta?.target;
          if (Array.isArray(target) && target.includes('idempotencyKey') || target === 'idempotencyKey') {
             // Return success as it was already processed
             return;
          }
      }
      throw error;
  }

  revalidatePath(`/arenas/${arenaId}/markets/${marketId}`)
  revalidatePath(`/arenas/${arenaId}/markets`)
}
