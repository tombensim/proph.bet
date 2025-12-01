"use server"

import { z } from "zod"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { placeBet } from "@/lib/services/bet-service"
import { prisma } from "@/lib/prisma"

const placeBetSchema = z.object({
  marketId: z.string(),
  amount: z.number().int().positive("Bet amount must be positive"),
  optionId: z.string().optional(),
  numericValue: z.number().optional(),
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

  const { marketId } = validated.data

  // Get arenaId for revalidation
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: { arenaId: true }
  })

  if (!market) {
    throw new Error("Market not found")
  }

  await placeBet({
    userId: session.user.id,
    ...validated.data
  })

  if (market.arenaId) {
    revalidatePath(`/arenas/${market.arenaId}/markets/${marketId}`)
    revalidatePath(`/arenas/${market.arenaId}/markets`)
  }
}
