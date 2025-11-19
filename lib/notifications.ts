import { prisma } from "@/lib/prisma"
import { NotificationType } from "@prisma/client"
import { resend } from "@/lib/resend"
import { BetResolvedEmail } from "@/components/emails/bet-resolved"
import { MarketResolvedEmail } from "@/components/emails/market-resolved"

export type NotificationMetadata = {
  marketId?: string
  betId?: string
  outcome?: string
  payout?: number
  [key: string]: any
}

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  content: string
  arenaId?: string
  metadata?: NotificationMetadata
  emailData?: {
    marketTitle?: string
    marketId?: string
    arenaId?: string
    winningOption?: string
    outcome?: "WON" | "LOST"
    profit?: number
  }
}

export async function createNotification({
  userId,
  type,
  content,
  arenaId,
  metadata,
  emailData
}: CreateNotificationParams) {
  // 1. Create DB Notification
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      content,
      arenaId,
      metadata: metadata as any,
    },
  })

  // 2. Check Settings
  let settings = await prisma.notificationSettings.findUnique({
    where: { userId },
  })

  if (!settings) {
    settings = await prisma.notificationSettings.create({
      data: { userId },
    })
  }

  // Map notification type to settings field
  const emailEnabled = (() => {
    switch (type) {
      case "BET_RESOLVED": return settings.email_BET_RESOLVED
      case "MARKET_RESOLVED": return settings.email_MARKET_RESOLVED
      case "WIN_PAYOUT": return settings.email_WIN_PAYOUT
      case "MARKET_CREATED": return settings.email_MARKET_CREATED
      case "MONTHLY_WINNER": return settings.email_MONTHLY_WINNER
      case "POINTS_RESET": return settings.email_POINTS_RESET
      default: return false
    }
  })()

  if (emailEnabled && emailData) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    })

    if (user?.email) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proph.bet"
      const marketLink = emailData.arenaId && emailData.marketId 
        ? `${baseUrl}/arenas/${emailData.arenaId}/markets/${emailData.marketId}`
        : baseUrl

      try {
        if (type === "BET_RESOLVED" && emailData.marketTitle && emailData.outcome) {
          await resend.emails.send({
            from: 'Proph.bet <noreply@proph.bet>',
            to: user.email,
            subject: `Bet Resolved: ${emailData.marketTitle}`,
            react: BetResolvedEmail({
              userName: user.name || "User",
              marketTitle: emailData.marketTitle,
              outcome: emailData.outcome,
              profit: emailData.profit,
              marketLink,
              baseUrl
            })
          })
        } else if (type === "MARKET_RESOLVED" && emailData.marketTitle && emailData.winningOption) {
          await resend.emails.send({
            from: 'Proph.bet <noreply@proph.bet>',
            to: user.email,
            subject: `Market Resolved: ${emailData.marketTitle}`,
            react: MarketResolvedEmail({
              userName: user.name || "User",
              marketTitle: emailData.marketTitle,
              winningOption: emailData.winningOption,
              marketLink,
              baseUrl
            })
          })
        }
      } catch (error) {
        console.error(`[Notification] Failed to send email:`, error)
      }
    }
  }

  return notification
}
