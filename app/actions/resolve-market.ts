"use server"

import { z } from "zod"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { resolveMarket } from "@/lib/services/market-service"
import { prisma } from "@/lib/prisma"

const resolveSchema = z.object({
  marketId: z.string(),
  winningOptionId: z.string().optional(),
  winningValue: z.number().optional(),
  resolutionImage: z.string().optional(),
})

export async function resolveMarketAction(data: z.infer<typeof resolveSchema>) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const { marketId } = data

  // Get arenaId for revalidation
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: { arenaId: true }
  })

  if (!market) {
    throw new Error("Market not found")
  }

  await resolveMarket({
    userId: session.user.id,
    userRole: session.user.role || "USER",
    marketId: data.marketId,
    winningOptionId: data.winningOptionId,
    winningValue: data.winningValue,
    resolutionImage: data.resolutionImage,
  })

  if (market.arenaId) {
    revalidatePath(`/arenas/${market.arenaId}/markets/${marketId}`)
    revalidatePath(`/arenas/${market.arenaId}/markets`)
  }
}
