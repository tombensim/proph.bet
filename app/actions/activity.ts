"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function getNotifications(arenaId?: string) {
  const session = await auth()
  if (!session?.user?.id) return []

  const whereClause: any = {
    userId: session.user.id,
  }

  if (arenaId) {
    whereClause.arenaId = arenaId
  }

  const notifications = await prisma.notification.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      arena: {
        select: { id: true, name: true }
      }
    }
  })

  return notifications
}

