"use server"

import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

const notificationSettingsSchema = z.object({
  email_BET_RESOLVED: z.boolean(),
  web_BET_RESOLVED: z.boolean(),
  email_MARKET_RESOLVED: z.boolean(),
  web_MARKET_RESOLVED: z.boolean(),
  email_WIN_PAYOUT: z.boolean(),
  web_WIN_PAYOUT: z.boolean(),
  email_MARKET_CREATED: z.boolean(),
  web_MARKET_CREATED: z.boolean(),
  email_MONTHLY_WINNER: z.boolean(),
  web_MONTHLY_WINNER: z.boolean(),
  email_POINTS_RESET: z.boolean(),
  web_POINTS_RESET: z.boolean(),
})

export type NotificationSettingsData = z.infer<typeof notificationSettingsSchema>

export async function getNotificationSettings() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  let settings = await prisma.notificationSettings.findUnique({
    where: { userId: session.user.id }
  })

  if (!settings) {
    // Create default settings
    settings = await prisma.notificationSettings.create({
      data: { userId: session.user.id }
    })
  }

  return settings
}

export async function updateNotificationSettings(data: NotificationSettingsData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const validated = notificationSettingsSchema.parse(data)

  await prisma.notificationSettings.update({
    where: { userId: session.user.id },
    data: validated
  })

  revalidatePath("/settings")
}

