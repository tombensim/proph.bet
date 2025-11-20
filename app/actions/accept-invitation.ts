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
  
  // Check usage limit
  const isUnlimited = invitation.usageLimit === null
  const hasRemainingUses = isUnlimited || (invitation.usageCount < invitation.usageLimit!)

  if (!hasRemainingUses) throw new Error("Invitation limit reached")
  if (invitation.status === 'EXPIRED' || invitation.status === 'DECLINED') throw new Error("Invitation is no longer valid")

  // Check if user matches the email (only if email is specified)
  if (invitation.email && invitation.email.toLowerCase() !== session.user.email?.toLowerCase()) {
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

  // Update invitation usage
  const newUsageCount = invitation.usageCount + 1
  const shouldClose = !isUnlimited && newUsageCount >= invitation.usageLimit!

  await prisma.$transaction([
    prisma.invitation.update({
        where: { id: invitation.id },
        data: { 
            usageCount: newUsageCount,
            status: shouldClose ? 'ACCEPTED' : invitation.status 
        }
    }),
    prisma.invitationUsage.create({
        data: {
            invitationId: invitation.id,
            userId: session.user.id
        }
    })
  ])

  redirect(`/arenas/${invitation.arenaId}/markets`)
}

