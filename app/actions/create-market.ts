"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
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
    hideBetsFromUserIds
  } = validated.data

  const market = await prisma.market.create({
    data: {
      title,
      description: description || "",
      type,
      resolutionDate,
      creatorId: session.user.id,
      minBet: minBet || null,
      maxBet: maxBet || null,
      options: type === MarketType.MULTIPLE_CHOICE && options ? {
        create: options.map(o => ({ text: o.value }))
      } : type === MarketType.BINARY ? {
        create: [{ text: "Yes" }, { text: "No" }]
      } : undefined,
      hiddenUsers: hiddenFromUserIds && hiddenFromUserIds.length > 0 ? {
        connect: hiddenFromUserIds.map(id => ({ id }))
      } : undefined,
      hideBetsFromUsers: hideBetsFromUserIds && hideBetsFromUserIds.length > 0 ? {
        connect: hideBetsFromUserIds.map(id => ({ id }))
      } : undefined
    },
  })

  redirect(`/markets`)
}
