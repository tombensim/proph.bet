"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Role, ArenaRole } from "@prisma/client"

export async function updateMarketVisibilityAction(
  marketId: string, 
  hiddenFromUserIds: string[], 
  hideBetsFromUserIds: string[]
) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: {
        arena: true
    }
  })

  if (!market) {
    throw new Error("Market not found")
  }

  // Authorization Check
  const isCreator = market.creatorId === session.user.id
  const isGlobalAdmin = session.user.role === Role.ADMIN || session.user.role === Role.GLOBAL_ADMIN
  
  let isArenaAdmin = false
  if (market.arenaId) {
    const membership = await prisma.arenaMembership.findUnique({
        where: { userId_arenaId: { userId: session.user.id, arenaId: market.arenaId } }
    })
    isArenaAdmin = membership?.role === ArenaRole.ADMIN
  }

  if (!isCreator && !isGlobalAdmin && !isArenaAdmin) {
    throw new Error("Unauthorized: You do not have permission to edit this market.")
  }

  // Update Market
  await prisma.market.update({
    where: { id: marketId },
    data: {
        hiddenUsers: {
            set: hiddenFromUserIds.map(id => ({ id }))
        },
        hideBetsFromUsers: {
            set: hideBetsFromUserIds.map(id => ({ id }))
        }
    }
  })

  revalidatePath(`/arenas/${market.arenaId}/markets/${marketId}`)
  return { success: true }
}

