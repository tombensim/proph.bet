"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { ArenaRole } from "@prisma/client"

export async function addMemberAction(email: string, arenaId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  // Check requester role
  const requesterMembership = await prisma.arenaMembership.findUnique({
    where: { userId_arenaId: { userId: session.user.id, arenaId } }
  })

  if (requesterMembership?.role !== "ADMIN") {
    throw new Error("Unauthorized: Only arena admins can add members")
  }

  // Find user
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new Error("User not found")

  // Check if already member
  const existing = await prisma.arenaMembership.findUnique({
    where: { userId_arenaId: { userId: user.id, arenaId } }
  })
  if (existing) throw new Error("User is already a member")

  // Add member
  await prisma.arenaMembership.create({
    data: {
      userId: user.id,
      arenaId,
      role: ArenaRole.MEMBER,
      points: 1000
    }
  })

  revalidatePath(`/arenas/${arenaId}/members`)
}

