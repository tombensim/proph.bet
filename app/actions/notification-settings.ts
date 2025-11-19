"use server"

import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

const notificationSettingsSchema = z.object({
  muted: z.boolean().optional().default(false),
  email_BET_RESOLVED: z.boolean().optional().nullable(),
  web_BET_RESOLVED: z.boolean().optional().nullable(),
  email_MARKET_RESOLVED: z.boolean().optional().nullable(),
  web_MARKET_RESOLVED: z.boolean().optional().nullable(),
  email_WIN_PAYOUT: z.boolean().optional().nullable(),
  web_WIN_PAYOUT: z.boolean().optional().nullable(),
  email_MARKET_CREATED: z.boolean().optional().nullable(),
  web_MARKET_CREATED: z.boolean().optional().nullable(),
  email_MONTHLY_WINNER: z.boolean().optional().nullable(),
  web_MONTHLY_WINNER: z.boolean().optional().nullable(),
  email_POINTS_RESET: z.boolean().optional().nullable(),
  web_POINTS_RESET: z.boolean().optional().nullable(),
  email_MARKET_DISPUTED: z.boolean().optional().nullable(),
  web_MARKET_DISPUTED: z.boolean().optional().nullable(),
})

export type NotificationSettingsData = z.infer<typeof notificationSettingsSchema>

export async function getNotificationSettings(arenaId?: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  if (arenaId && arenaId !== "global") {
     const membership = await prisma.arenaMembership.findUnique({
         where: { userId_arenaId: { userId: session.user.id, arenaId } },
         include: { notificationSettings: true }
     })

     if (!membership) throw new Error("Not a member of this arena")

     if (!membership.notificationSettings) {
         // Return nulls (inherits)
         return null 
     }
     return membership.notificationSettings
  }

  // Global Settings
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

export async function updateNotificationSettings(data: NotificationSettingsData, arenaId?: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  if (arenaId && arenaId !== "global") {
      const membership = await prisma.arenaMembership.findUnique({
          where: { userId_arenaId: { userId: session.user.id, arenaId } }
      })
      if (!membership) throw new Error("Not a member")

      // Check if settings exist
      const existing = await prisma.arenaNotificationSettings.findUnique({
          where: { membershipId: membership.id }
      })

      if (existing) {
          await prisma.arenaNotificationSettings.update({
              where: { id: existing.id },
              data: data
          })
      } else {
          await prisma.arenaNotificationSettings.create({
              data: {
                  membershipId: membership.id,
                  ...data
              }
          })
      }
  } else {
      // Global settings don't have "muted" field currently, only Arena settings.
      // Filter out nulls and 'muted' if present for global.
      const cleanData: any = {}
      Object.keys(data).forEach(k => {
          if (k === "muted") return; // Global doesn't have muted currently
          
          const val = (data as any)[k]
          if (typeof val === 'boolean') {
              cleanData[k] = val
          }
      })

      await prisma.notificationSettings.update({
        where: { userId: session.user.id },
        data: cleanData
      })
  }

  revalidatePath("/settings")
}
