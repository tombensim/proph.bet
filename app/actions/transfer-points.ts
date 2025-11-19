"use server"

import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { TransactionType } from "@prisma/client"
import { redirect } from "next/navigation"

const transferSchema = z.object({
  email: z.string().email(),
  amount: z.number().int().positive(),
  arenaId: z.string()
})

export type TransferValues = z.infer<typeof transferSchema>

export async function transferPointsAction(data: TransferValues) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const validated = transferSchema.safeParse(data)
  if (!validated.success) {
    throw new Error("Invalid data")
  }

  const { email, amount, arenaId } = validated.data

  if (email === session.user.email) {
      throw new Error("You cannot transfer points to yourself")
  }

  await prisma.$transaction(async (tx) => {
    // 1. Check Sender Membership & Balance
    if (!session?.user?.id) throw new Error("Unauthorized")
    const senderMembership = await tx.arenaMembership.findUnique({
      where: { 
        userId_arenaId: { 
          userId: session.user.id, 
          arenaId 
        } 
      },
      include: { user: true }
    })

    if (!senderMembership) {
      throw new Error("You are not a member of this arena")
    }

    if (senderMembership.points < amount) {
      throw new Error(`Insufficient points. You have ${senderMembership.points}.`)
    }

    // 2. Find Receiver
    const receiverUser = await tx.user.findUnique({
      where: { email }
    })

    if (!receiverUser) {
      throw new Error("User with this email not found")
    }

    // 3. Find Receiver Membership
    const receiverMembership = await tx.arenaMembership.findUnique({
      where: { 
        userId_arenaId: { 
          userId: receiverUser.id, 
          arenaId 
        } 
      }
    })

    if (!receiverMembership) {
      throw new Error("Receiver is not a member of this arena")
    }

    // 4. Deduct from Sender
    await tx.arenaMembership.update({
      where: { id: senderMembership.id },
      data: { points: { decrement: amount } }
    })

    // 5. Add to Receiver
    await tx.arenaMembership.update({
      where: { id: receiverMembership.id },
      data: { points: { increment: amount } }
    })

    // 6. Log Transaction
    await tx.transaction.create({
      data: {
        amount,
        type: TransactionType.USER_TRANSFER,
        fromUserId: senderMembership.userId,
        toUserId: receiverMembership.userId,
        arenaId
      }
    })
  })

  revalidatePath(`/arenas/${arenaId}`)
  redirect(`/arenas/${arenaId}/leaderboard`)
}
