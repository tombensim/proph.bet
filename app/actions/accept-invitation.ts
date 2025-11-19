"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ArenaRole } from "@prisma/client"

export async function acceptInvitationAction(token: string) {
  const session = await auth()
  
  if (!session?.user?.id) {
     // If not logged in, we can't accept. 
     // The UI should have handled redirection or login prompt.
     throw new Error("Unauthorized")
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { arena: true }
  })

  if (!invitation) throw new Error("Invalid invitation")
  if (invitation.expiresAt < new Date()) throw new Error("Invitation expired")
  if (invitation.status !== 'PENDING') throw new Error("Invitation already used")

  // Check if user matches the email? 
  // Ideally yes, but maybe they want to accept with a different email?
  // Security-wise, it's safer to enforce email match OR just invalidate the token once used.
  // If we enforce email match:
  if (invitation.email.toLowerCase() !== session.user.email?.toLowerCase()) {
      // Allow mismatch? "This invitation was sent to X, but you are logged in as Y."
      // Usually we warn them or block it.
      // For now, let's BLOCK it to prevent accidental accepts by wrong account.
      throw new Error(`This invitation was sent to ${invitation.email}, but you are logged in as ${session.user.email}`)
  }

  // Create membership
  // Check if already member
  const existing = await prisma.arenaMembership.findUnique({
      where: { userId_arenaId: { userId: session.user.id, arenaId: invitation.arenaId } }
  })

  if (!existing) {
      await prisma.arenaMembership.create({
          data: {
              userId: session.user.id,
              arenaId: invitation.arenaId,
              role: invitation.role,
              points: 1000
          }
      })
  }

  // Update invitation status
  await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' }
  })

  redirect(`/arenas/${invitation.arenaId}/markets`)
}

