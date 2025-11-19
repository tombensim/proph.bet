"use server"

import { prisma } from "@/lib/prisma"
import { createHmac } from "crypto"

const UNSUBSCRIBE_SECRET = process.env.NEXTAUTH_SECRET || "unsubscribe-secret"

function generateSignature(userId: string) {
  return createHmac("sha256", UNSUBSCRIBE_SECRET).update(userId).digest("hex")
}

export async function verifyUnsubscribeToken(userId: string, token: string) {
  const expected = generateSignature(userId)
  return expected === token
}

export async function generateUnsubscribeLink(userId: string) {
  const token = generateSignature(userId)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proph.bet"
  return `${baseUrl}/unsubscribe?uid=${userId}&token=${token}`
}

export async function unsubscribeAll(userId: string, token: string) {
    const isValid = await verifyUnsubscribeToken(userId, token)
    if (!isValid) throw new Error("Invalid token")

    // Update global settings to false for all emails
    await prisma.notificationSettings.upsert({
        where: { userId },
        create: {
            userId,
            email_BET_RESOLVED: false,
            email_MARKET_RESOLVED: false,
            email_WIN_PAYOUT: false,
            email_MARKET_CREATED: false,
            email_MONTHLY_WINNER: false,
            email_POINTS_RESET: false,
            email_MARKET_DISPUTED: false,
        },
        update: {
            email_BET_RESOLVED: false,
            email_MARKET_RESOLVED: false,
            email_WIN_PAYOUT: false,
            email_MARKET_CREATED: false,
            email_MONTHLY_WINNER: false,
            email_POINTS_RESET: false,
            email_MARKET_DISPUTED: false,
        }
    })

    return true
}

