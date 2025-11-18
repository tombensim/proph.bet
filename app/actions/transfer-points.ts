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

  const { email, amount } = validated.data

  if (email === session.user.email) {
      throw new Error("You cannot transfer points to yourself")
  }

  await prisma.$transaction(async (tx) => {
    // 1. Check Sender Balance
    const sender = await tx.user.findUniqueOrThrow({
      where: { id: session.user!.id }
    })

    if (sender.points < amount) {
      throw new Error(`Insufficient points. You have ${sender.points}.`)
    }

    // 2. Find Receiver
    const receiver = await tx.user.findUnique({
      where: { email }
    })

    if (!receiver) {
      throw new Error("User with this email not found")
    }

    // 3. Deduct from Sender
    await tx.user.update({
      where: { id: sender.id },
      data: { points: { decrement: amount } }
    })

    // 4. Add to Receiver
    await tx.user.update({
      where: { id: receiver.id },
      data: { points: { increment: amount } }
    })

    // 5. Log Transaction
    await tx.transaction.create({
      data: {
        amount,
        type: TransactionType.USER_TRANSFER,
        fromUserId: sender.id,
        toUserId: receiver.id,
      }
    })
  })

  revalidatePath('/')
  redirect('/leaderboard')
}

