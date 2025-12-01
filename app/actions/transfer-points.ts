"use server"

import { z } from "zod"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { redirect as nextRedirect } from "next/navigation"
import { transferPoints } from "@/lib/services/transfer-service"

const transferSchema = z.object({
  email: z.string().email(),
  amount: z.number().int().positive(),
  arenaId: z.string()
})

export type TransferValues = z.infer<typeof transferSchema>

export async function transferPointsAction(data: TransferValues) {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    throw new Error("Unauthorized")
  }

  const validated = transferSchema.safeParse(data)
  if (!validated.success) {
    throw new Error("Invalid data")
  }

  const { email, amount, arenaId } = validated.data

  await transferPoints({
    userId: session.user.id,
    userEmail: session.user.email,
    toUserEmail: email,
    amount,
    arenaId,
  })

  revalidatePath(`/arenas/${arenaId}`)
  nextRedirect(`/arenas/${arenaId}/leaderboard`)
}
