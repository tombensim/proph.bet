"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { ArenaRole } from "@prisma/client"
import { resend } from "@/lib/resend"
import { ArenaInvitationEmail } from "@/components/emails/arena-invitation"
import { v4 as uuidv4 } from "uuid"

export async function addMemberAction(email: string, arenaId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  // Check requester role
  const requesterMembership = await prisma.arenaMembership.findUnique({
    where: { userId_arenaId: { userId: session.user.id, arenaId } },
    include: { arena: true }
  })

  if (requesterMembership?.role !== "ADMIN") {
    throw new Error("Unauthorized: Only arena admins can invite members")
  }

  const arenaName = requesterMembership.arena.name
  const inviterName = session.user.name || "A user"

  // Find user
  const user = await prisma.user.findUnique({ where: { email } })

  if (user) {
    // Check if already member
    const existing = await prisma.arenaMembership.findUnique({
      where: { userId_arenaId: { userId: user.id, arenaId } }
    })
    if (existing) throw new Error("User is already a member")

    // Add member directly
    await prisma.arenaMembership.create({
      data: {
        userId: user.id,
        arenaId,
        role: ArenaRole.MEMBER,
        points: 1000
      }
    })

    // Send notification email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proph.bet";
    const arenaLink = `${baseUrl}/arenas/${arenaId}/markets`
    
    try {
      await resend.emails.send({
        from: 'Proph.bet <noreply@proph.bet>',
        to: email,
        subject: `You have been added to ${arenaName}`,
        react: ArenaInvitationEmail({
          inviterName,
          arenaName,
          inviteLink: arenaLink,
          userEmail: email
        })
      })
    } catch (error) {
      console.error("Failed to send email", error)
      // Don't fail the action if email fails, as the user is already added
    }

  } else {
    // Check for existing pending invitation
    const existingInvite = await prisma.invitation.findUnique({
      where: { email_arenaId: { email, arenaId } }
    })

    const token = uuidv4()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proph.bet";
    const inviteLink = `${baseUrl}/invite/${token}`
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    if (existingInvite) {
      // Update existing invitation
      await prisma.invitation.update({
        where: { id: existingInvite.id },
        data: { 
          token, 
          expiresAt,
          status: 'PENDING',
          usageLimit: 1,
          usageCount: 0
        }
      })
    } else {
      // Create new invitation
      await prisma.invitation.create({
        data: {
          email,
          arenaId,
          inviterId: session.user.id,
          token,
          expiresAt,
          usageLimit: 1
        }
      })
    }

    // Send invitation email
    try {
      await resend.emails.send({
        from: 'Proph.bet <noreply@proph.bet>',
        to: email,
        subject: `You have been invited to join ${arenaName}`,
        react: ArenaInvitationEmail({
          inviterName,
          arenaName,
          inviteLink,
          userEmail: email
        })
      })
    } catch (error) {
      console.error("Failed to send email", error)
      throw new Error("Failed to send invitation email")
    }
  }

  revalidatePath(`/arenas/${arenaId}/members`)
}

export async function createPublicInviteAction(arenaId: string, expiresInHours: number | null) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    // Check admin
     const requesterMembership = await prisma.arenaMembership.findUnique({
        where: { userId_arenaId: { userId: session.user.id, arenaId } }
      })

      if (requesterMembership?.role !== "ADMIN") {
        throw new Error("Unauthorized: Only arena admins can create invites")
      }

      const token = uuidv4()
      // If expiresInHours is null, set to 100 years
      const expiresAt = expiresInHours 
        ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
        : new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000)

      await prisma.invitation.create({
          data: {
              arenaId,
              inviterId: session.user.id,
              token,
              expiresAt,
              email: null, // Public invite
              status: 'PENDING',
              usageLimit: null
          }
      })
      
      revalidatePath(`/arenas/${arenaId}/members`)
      return token
}

export async function revokeInvitationAction(invitationId: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const invitation = await prisma.invitation.findUnique({
        where: { id: invitationId },
        select: { arenaId: true }
    })
    
    if (!invitation) throw new Error("Invitation not found")

     const requesterMembership = await prisma.arenaMembership.findUnique({
        where: { userId_arenaId: { userId: session.user.id, arenaId: invitation.arenaId } }
      })

      if (requesterMembership?.role !== "ADMIN") {
        throw new Error("Unauthorized")
      }

      await prisma.invitation.delete({
          where: { id: invitationId }
      })
      
      revalidatePath(`/arenas/${invitation.arenaId}/members`)
}
