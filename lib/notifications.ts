import { prisma } from "@/lib/prisma"
import { NotificationType } from "@prisma/client"
import { resend } from "@/lib/resend"
import { BetResolvedEmail } from "@/components/emails/bet-resolved"
import { MarketResolvedEmail } from "@/components/emails/market-resolved"
import { generateUnsubscribeLink } from "@/app/actions/unsubscribe"

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

  // 2. Check Global Settings
  let globalSettings = await prisma.notificationSettings.findUnique({
    where: { userId },
  })

  if (!globalSettings) {
    globalSettings = await prisma.notificationSettings.create({
      data: { userId },
    })
  }

  // 3. Check Arena Overrides
  let arenaSettings = null
  if (arenaId) {
    // Find membership
    const membership = await prisma.arenaMembership.findUnique({
        where: { userId_arenaId: { userId, arenaId } },
        include: { notificationSettings: true }
    })
    if (membership?.notificationSettings) {
        arenaSettings = membership.notificationSettings
    }
  }

  // Helper to resolve setting (Arena Override > Global Default)
  const getSetting = (key: keyof typeof globalSettings) => {
    // If arena muted, return false for everything
    if (arenaSettings?.muted) {
        return false
    }

    // The schema for global is Boolean, for Arena is Boolean?
    // We need to cast keys because TypeScript doesn't know they match perfectly yet
    if (arenaSettings) {
        const arenaVal = (arenaSettings as any)[key]
        if (arenaVal !== null && arenaVal !== undefined) {
            return arenaVal
        }
    }
    return (globalSettings as any)[key]
  }

  // Map notification type to settings field
  const emailEnabled = (() => {
    switch (type) {
      case "BET_RESOLVED": return getSetting("email_BET_RESOLVED")
      case "MARKET_RESOLVED": return getSetting("email_MARKET_RESOLVED")
      case "WIN_PAYOUT": return getSetting("email_WIN_PAYOUT")
      case "MARKET_CREATED": return getSetting("email_MARKET_CREATED")
      case "MONTHLY_WINNER": return getSetting("email_MONTHLY_WINNER")
      case "POINTS_RESET": return getSetting("email_POINTS_RESET")
      case "MARKET_DISPUTED": return getSetting("email_MARKET_DISPUTED")
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
      
      const unsubscribeLink = await generateUnsubscribeLink(userId)

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
            }),
            headers: {
                "List-Unsubscribe": `<${unsubscribeLink}>`
            }
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
            }),
            headers: {
                "List-Unsubscribe": `<${unsubscribeLink}>`
            }
          })
        } else if (type === "MARKET_DISPUTED" && emailData.marketTitle) {
             await resend.emails.send({
            from: 'Proph.bet <noreply@proph.bet>',
            to: user.email,
            subject: `Dispute Filed: ${emailData.marketTitle}`,
            html: `
              <div style="font-family: sans-serif; color: #333;">
                <h1>Market Disputed</h1>
                <p>The market "<strong>${emailData.marketTitle}</strong>" has been disputed.</p>
                <p><a href="${marketLink}" style="color: #0070f3; text-decoration: none;">View Market</a></p>
                <p style="font-size: 12px; color: #666; margin-top: 20px;">
                    <a href="${unsubscribeLink}" style="color: #666; text-decoration: underline;">Unsubscribe</a>
                </p>
              </div>
            `,
            headers: {
                "List-Unsubscribe": `<${unsubscribeLink}>`
            }
          })
        }
      } catch (error) {
        console.error(`[Notification] Failed to send email:`, error)
      }
    }
  }

  return notification
}
