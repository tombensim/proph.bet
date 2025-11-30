import { prisma } from "@/lib/prisma"

/**
 * Get notifications for a user
 */
export async function getNotifications(userId: string, arenaId?: string, limit = 50) {
  const whereClause: Record<string, unknown> = {
    userId,
  }

  if (arenaId) {
    whereClause.arenaId = arenaId
  }

  const notifications = await prisma.notification.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      arena: {
        select: { id: true, name: true }
      }
    }
  })

  return notifications
}

/**
 * Mark notifications as read
 */
export async function markNotificationsRead(userId: string, notificationIds?: string[]) {
  if (notificationIds && notificationIds.length > 0) {
    await prisma.notification.updateMany({
      where: {
        userId,
        id: { in: notificationIds }
      },
      data: { read: true }
    })
  } else {
    // Mark all as read
    await prisma.notification.updateMany({
      where: { userId },
      data: { read: true }
    })
  }

  return { success: true }
}

/**
 * Get user profile
 */
export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true
    }
  })

  return user
}

/**
 * Get user's bet history
 */
export async function getUserBets(userId: string, arenaId?: string, limit = 50) {
  const bets = await prisma.bet.findMany({
    where: {
      userId,
      ...(arenaId && {
        market: { arenaId }
      })
    },
    include: {
      market: {
        select: {
          id: true,
          title: true,
          status: true,
          arenaId: true,
          winningOptionId: true
        }
      },
      option: {
        select: { id: true, text: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: limit
  })

  return bets.map(bet => ({
    ...bet,
    won: bet.market.status === "RESOLVED" && bet.optionId === bet.market.winningOptionId
  }))
}

/**
 * Get user's transaction history
 */
export async function getUserTransactions(userId: string, arenaId?: string, limit = 50) {
  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [
        { fromUserId: userId },
        { toUserId: userId }
      ],
      ...(arenaId && { arenaId })
    },
    include: {
      fromUser: {
        select: { id: true, name: true, image: true }
      },
      toUser: {
        select: { id: true, name: true, image: true }
      },
      market: {
        select: { id: true, title: true }
      },
      arena: {
        select: { id: true, name: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: limit
  })

  return transactions
}
