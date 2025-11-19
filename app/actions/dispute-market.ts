"use server"

import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { revalidatePath } from "next/cache"

const disputeSchema = z.object({
  marketId: z.string(),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
})

export async function disputeMarketAction(data: z.infer<typeof disputeSchema>) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const { marketId, reason } = disputeSchema.parse(data)

  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: { arena: true }
  })

  if (!market) throw new Error("Market not found")
  if (market.status !== "RESOLVED") throw new Error("Market is not resolved")

  await prisma.dispute.create({
    data: {
      userId: session.user.id,
      marketId,
      reason,
    }
  })

  // Notify Creator
  if (market.creatorId !== session.user.id) {
      await createNotification({
        userId: market.creatorId,
        type: "MARKET_DISPUTED",
        content: `Your market "${market.title}" has been disputed.`,
        arenaId: market.arenaId || undefined,
        metadata: {
            marketId: market.id,
            reason
        },
        emailData: {
            marketTitle: market.title,
            marketId: market.id,
            arenaId: market.arenaId || undefined,
        }
      })
  }

  // Notify Arena Admins
  if (market.arenaId) {
      const admins = await prisma.arenaMembership.findMany({
          where: {
              arenaId: market.arenaId,
              role: "ADMIN"
          },
          select: { userId: true }
      })
      
      for (const admin of admins) {
          // Avoid double notifying if creator is admin
          if (admin.userId === market.creatorId) continue;
          if (admin.userId === session.user.id) continue; // Don't notify self

          await createNotification({
            userId: admin.userId,
            type: "MARKET_DISPUTED",
            content: `Market "${market.title}" has been disputed.`,
            arenaId: market.arenaId,
            metadata: {
                marketId: market.id,
                reason
            },
            emailData: {
                marketTitle: market.title,
                marketId: market.id,
                arenaId: market.arenaId,
            }
          })
      }
  }

  revalidatePath(`/arenas/${market.arenaId}/markets/${marketId}`)
}

