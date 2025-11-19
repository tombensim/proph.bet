"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ArenaRole, Role } from "@prisma/client"
import { revalidatePath } from "next/cache"

async function requireArenaAdmin(arenaId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  if (session.user.role === Role.ADMIN || session.user.role === Role.GLOBAL_ADMIN) return

  const membership = await prisma.arenaMembership.findUnique({
    where: { userId_arenaId: { userId: session.user.id, arenaId } }
  })

  if (!membership || membership.role !== ArenaRole.ADMIN) {
    throw new Error("Unauthorized: Arena Admin required")
  }
}

export async function approveMarketAction(marketId: string, arenaId: string) {
  await requireArenaAdmin(arenaId)

  await prisma.market.update({
    where: { id: marketId },
    data: { approved: true }
  })

  revalidatePath(`/arenas/${arenaId}/markets`)
  return { success: true }
}

