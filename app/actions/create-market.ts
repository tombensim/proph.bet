"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect as nextRedirect } from "next/navigation"
import { MarketType } from "@prisma/client"
import { createMarketSchema, CreateMarketValues } from "@/lib/schemas"

export async function createMarketAction(data: CreateMarketValues) {
  const session = await auth()
  console.log("Session:", JSON.stringify(session, null, 2))
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const validated = createMarketSchema.safeParse(data)
  if (!validated.success) {
    throw new Error("Invalid data")
  }
  
  const { 
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
  } = validated.data

  // 1. CHECK ARENA SETTINGS & PERMISSIONS
  const arenaSettings = await prisma.arenaSettings.findUnique({
    where: { arenaId }
  })
  
  // Fallback defaults if no settings exist yet
  const creationPolicy = arenaSettings?.creationPolicy ?? "EVERYONE"
  const SEED_AMOUNT = arenaSettings?.seedLiquidity ?? 100
  const requireApproval = arenaSettings?.requireApproval ?? false
  const defaultLanguage = arenaSettings?.defaultLanguage ?? "en"

  // Check Creation Policy
  if (creationPolicy === "ADMIN") {
    // Check if user is admin
    const membership = await prisma.arenaMembership.findUnique({
      where: { userId_arenaId: { userId: session.user.id, arenaId } }
    })
    const isGlobalAdmin = session.user.role === "ADMIN" || session.user.role === "GLOBAL_ADMIN"
    const isArenaAdmin = membership?.role === "ADMIN"
    
    if (!isGlobalAdmin && !isArenaAdmin) {
      throw new Error("Only admins can create markets in this arena")
    }
  }
  // TODO: Implement APPROVED_CREATORS logic if needed later

  // 2. CALCULATE TOTAL COST
  let totalCost = 0;
  if (type === MarketType.BINARY) {
    totalCost = SEED_AMOUNT * 2;
  } else if ((type === MarketType.MULTIPLE_CHOICE || type === MarketType.NUMERIC_RANGE) && options) {
    totalCost = SEED_AMOUNT * options.length;
  }

  // 3. CHECK & DEDUCT POINTS (Transaction)
  await prisma.$transaction(async (tx) => {
    // Verify membership
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
        creatorId: session.user.id,
        arenaId,
        minBet: minBet || null,
        maxBet: maxBet || null,
        options: (type === MarketType.MULTIPLE_CHOICE || type === MarketType.NUMERIC_RANGE) && options ? {
          create: options.map(o => ({ 
            text: o.value,
            liquidity: SEED_AMOUNT // Initialize with seed amount
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
    // The creator effectively bets on EVERYTHING.
    if (totalCost > 0 && market.options.length > 0) {
      for (const option of market.options) {
        await tx.bet.create({
          data: {
            userId: session.user.id,
            marketId: market.id,
            optionId: option.id,
            amount: SEED_AMOUNT,
            shares: SEED_AMOUNT, // Initial 1:1 ratio
          }
        })
      }
    }
  })

  nextRedirect(`/arenas/${arenaId}/markets`)
}
