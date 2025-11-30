import { prisma } from "@/lib/prisma"
import { TransactionType } from "@prisma/client"

export interface TransferPointsParams {
  userId: string
  userEmail: string
  toUserEmail: string
  amount: number
  arenaId: string
}

export interface TransferPointsResult {
  success: boolean
  error?: string
}

/**
 * Core point transfer logic - used by both server actions and API routes
 */
export async function transferPoints(params: TransferPointsParams): Promise<TransferPointsResult> {
  const { userId, userEmail, toUserEmail, amount, arenaId } = params

  // 0. Check Arena Rules
  const arenaSettings = await prisma.arenaSettings.findUnique({ where: { arenaId } })
  const allowTransfers = arenaSettings?.allowTransfers ?? true
  const transferLimit = arenaSettings?.transferLimit

  if (!allowTransfers) {
    throw new Error("Point transfers are disabled in this arena")
  }

  if (transferLimit && amount > transferLimit) {
    throw new Error(`Transfer limit exceeded. Maximum allowed is ${transferLimit} points.`)
  }

  if (toUserEmail === userEmail) {
    throw new Error("You cannot transfer points to yourself")
  }

  await prisma.$transaction(async (tx) => {
    // 1. Check Sender Membership & Balance
    const senderMembership = await tx.arenaMembership.findUnique({
      where: {
        userId_arenaId: {
          userId,
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
      where: { email: toUserEmail }
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

  return { success: true }
}
