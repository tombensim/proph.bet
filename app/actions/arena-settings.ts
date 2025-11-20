"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ArenaRole, Role } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { redirect } from "next/navigation"

async function requireArenaAdmin(arenaId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  if (session.user.role === Role.ADMIN || session.user.role === Role.GLOBAL_ADMIN) return

  const membership = await prisma.arenaMembership.findUnique({
    where: { userId_arenaId: { userId: session.user.id, arenaId } }
  })

  if (!membership || membership.role !== ArenaRole.ADMIN) {
    throw new Error("Unauthorized: Arena Admin required")
  }
}

const analystSchema = z.object({
  name: z.string().min(2),
  prompt: z.string().min(10),
  avatar: z.string().optional(),
})

const updateAnalystsSchema = z.object({
  arenaId: z.string(),
  analysts: z.array(analystSchema),
  analystsEnabled: z.boolean()
})

export async function updateArenaAnalystsAction(data: { arenaId: string; analysts: any[]; analystsEnabled: boolean }) {
  await requireArenaAdmin(data.arenaId)

  const validated = updateAnalystsSchema.parse(data)

  await prisma.arenaSettings.update({
    where: { arenaId: data.arenaId },
    data: {
      analysts: validated.analysts as any, // Prisma handles JSON
      analystsEnabled: validated.analystsEnabled
    }
  })

  revalidatePath(`/arenas/${data.arenaId}/settings`)
  return { success: true }
}

export async function archiveArenaAction(arenaId: string) {
  await requireArenaAdmin(arenaId)

  await prisma.arena.update({
    where: { id: arenaId },
    data: { archivedAt: new Date() }
  })

  revalidatePath(`/arenas/${arenaId}`)
  revalidatePath(`/arenas/${arenaId}/settings`)
  return { success: true }
}

export async function unarchiveArenaAction(arenaId: string) {
  await requireArenaAdmin(arenaId)

  await prisma.arena.update({
    where: { id: arenaId },
    data: { archivedAt: null }
  })

  revalidatePath(`/arenas/${arenaId}`)
  revalidatePath(`/arenas/${arenaId}/settings`)
  return { success: true }
}

export async function deleteArenaAction(arenaId: string) {
  await requireArenaAdmin(arenaId)

  await prisma.arena.delete({
    where: { id: arenaId }
  })

  // No revalidatePath needed since the arena is deleted
  // The component will redirect to home
  return { success: true }
}

// Get arena settings
export async function getArenaSettingsAction(arenaId: string) {
  await requireArenaAdmin(arenaId)

  const settings = await prisma.arenaSettings.findUnique({
    where: { arenaId }
  })

  if (!settings) throw new Error("Settings not found")
  
  return settings
}

// Get arena details
export async function getArenaDetailsAction(arenaId: string) {
  await requireArenaAdmin(arenaId)

  const arena = await prisma.arena.findUnique({
    where: { id: arenaId }
  })

  if (!arena) throw new Error("Arena not found")
  
  return arena
}

// Update arena details (name, description, about, coverImage)
const arenaDetailsSchema = z.object({
  id: z.string(),
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  about: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
})

export async function updateArenaDetailsAction(data: z.infer<typeof arenaDetailsSchema>) {
  await requireArenaAdmin(data.id)

  const validated = arenaDetailsSchema.parse(data)

  await prisma.arena.update({
    where: { id: validated.id },
    data: {
      name: validated.name,
      description: validated.description,
      about: validated.about,
      coverImage: validated.coverImage,
    }
  })

  revalidatePath(`/arenas/${data.id}`)
  revalidatePath(`/arenas/${data.id}/settings`)
  return { success: true }
}

// Update arena settings
const settingsSchema = z.object({
  arenaId: z.string(),
  resetFrequency: z.string(),
  winnerRule: z.string(),
  monthlyAllocation: z.number().min(0),
  allowCarryover: z.boolean(),
  allowTransfers: z.boolean(),
  transferLimit: z.number().optional().nullable(),
  creationPolicy: z.string(),
  allowedTypes: z.array(z.string()),
  defaultExpirationHours: z.number().min(1),
  requireApproval: z.boolean(),
  defaultLanguage: z.string().min(2),
  ammType: z.string(),
  tradingFeePercent: z.number().min(0).max(100),
  seedLiquidity: z.number().min(0),
  limitMultipleBets: z.boolean(),
  multiBetThreshold: z.number().min(1)
})

export async function updateArenaSettingsAction(data: any) {
  await requireArenaAdmin(data.arenaId)

  const validated = settingsSchema.parse(data)

  await prisma.arenaSettings.update({
    where: { arenaId: data.arenaId },
    data: {
      resetFrequency: validated.resetFrequency as any,
      winnerRule: validated.winnerRule as any,
      monthlyAllocation: validated.monthlyAllocation,
      allowCarryover: validated.allowCarryover,
      allowTransfers: validated.allowTransfers,
      transferLimit: validated.transferLimit,
      creationPolicy: validated.creationPolicy as any,
      allowedTypes: validated.allowedTypes as any,
      defaultExpirationHours: validated.defaultExpirationHours,
      requireApproval: validated.requireApproval,
      defaultLanguage: validated.defaultLanguage,
      ammType: validated.ammType as any,
      tradingFeePercent: validated.tradingFeePercent,
      seedLiquidity: validated.seedLiquidity,
      limitMultipleBets: validated.limitMultipleBets,
      multiBetThreshold: validated.multiBetThreshold
    }
  })

  revalidatePath(`/arenas/${data.arenaId}/settings`)
  return { success: true }
}
