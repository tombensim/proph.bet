"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ArenaRole, ResetFrequency, WinnerRule, MarketCreationPolicy, AMMType, MarketType, Role } from "@prisma/client"
import { z } from "zod"
import { revalidatePath } from "next/cache"

// Helper to ensure admin access
async function requireArenaAdmin(arenaId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  // Global admins can manage any arena
  if (session.user.role === Role.ADMIN || session.user.role === Role.GLOBAL_ADMIN) return

  // Check arena role
  const membership = await prisma.arenaMembership.findUnique({
    where: { userId_arenaId: { userId: session.user.id, arenaId } }
  })

  if (!membership || membership.role !== ArenaRole.ADMIN) {
    throw new Error("Unauthorized: Arena Admin required")
  }
}

const updateSettingsSchema = z.object({
  arenaId: z.string(),
  
  // Cycle
  resetFrequency: z.nativeEnum(ResetFrequency),
  winnerRule: z.nativeEnum(WinnerRule),
  
  // Points
  monthlyAllocation: z.number().min(0),
  allowCarryover: z.boolean(),
  allowTransfers: z.boolean(),
  transferLimit: z.number().optional().nullable(),
  
  // Markets
  creationPolicy: z.nativeEnum(MarketCreationPolicy),
  allowedTypes: z.array(z.nativeEnum(MarketType)),
  defaultExpirationHours: z.number().min(1),
  requireApproval: z.boolean(),
  defaultLanguage: z.string().min(2).max(10),
  
  // AMM
  ammType: z.nativeEnum(AMMType),
  tradingFeePercent: z.number().min(0).max(100),
  seedLiquidity: z.number().min(0)
})

export type UpdateSettingsValues = z.infer<typeof updateSettingsSchema>

export async function getArenaSettingsAction(arenaId: string) {
  await requireArenaAdmin(arenaId)
  
  let settings = await prisma.arenaSettings.findUnique({
    where: { arenaId }
  })

  if (!settings) {
    // Create default settings if not exists
    settings = await prisma.arenaSettings.create({
      data: { arenaId }
    })
  }

  return settings
}

export async function updateArenaSettingsAction(data: UpdateSettingsValues) {
  await requireArenaAdmin(data.arenaId)

  const validated = updateSettingsSchema.parse(data)

  await prisma.arenaSettings.upsert({
    where: { arenaId: data.arenaId },
    create: validated,
    update: validated
  })

  revalidatePath(`/arenas/${data.arenaId}/settings`)
  return { success: true }
}

