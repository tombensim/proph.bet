"use server"

import { auth } from "@/lib/auth"
import { redirect as nextRedirect } from "next/navigation"
import { createMarketSchema, CreateMarketValues } from "@/lib/schemas"
import { createMarket } from "@/lib/services/market-service"

export async function createMarketAction(data: CreateMarketValues) {
  const session = await auth()
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const validated = createMarketSchema.safeParse(data)
  if (!validated.success) {
    throw new Error("Invalid data")
  }

  const { arenaId } = validated.data

  await createMarket({
    userId: session.user.id,
    userRole: session.user.role || "USER",
    title: validated.data.title,
    description: validated.data.description,
    type: validated.data.type,
    resolutionDate: validated.data.resolutionDate,
    options: validated.data.options,
    minBet: validated.data.minBet,
    maxBet: validated.data.maxBet,
    hiddenFromUserIds: validated.data.hiddenFromUserIds,
    hideBetsFromUserIds: validated.data.hideBetsFromUserIds,
    arenaId: validated.data.arenaId,
    assets: validated.data.assets,
  })

  nextRedirect(`/arenas/${arenaId}/markets`)
}
