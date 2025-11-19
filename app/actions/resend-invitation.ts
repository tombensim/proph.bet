"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { resend } from "@/lib/resend"
import { ArenaInvitationEmail } from "@/components/emails/arena-invitation"
import { v4 as uuidv4 } from "uuid"

export async function resendInvitationAction(invitationId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  // Fetch invitation with arena details
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { arena: true }
  })

  if (!invitation) throw new Error("Invitation not found")

  // Check permissions
  const requesterMembership = await prisma.arenaMembership.findUnique({
    where: { userId_arenaId: { userId: session.user.id, arenaId: invitation.arenaId } }
  })

  if (requesterMembership?.role !== "ADMIN") {
    throw new Error("Unauthorized: Only arena admins can resend invitations")
  }

  // Refresh token and expiration
  const token = uuidv4()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await prisma.invitation.update({
    where: { id: invitationId },
    data: { token, expiresAt }
  })

  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`
  const arenaName = invitation.arena.name
  const inviterName = session.user.name || "A user"

  // Send email
  try {
    await resend.emails.send({
      from: 'Proph.bet <noreply@proph.bet>',
      to: invitation.email,
      subject: `Reminder: You have been invited to join ${arenaName}`,
      react: ArenaInvitationEmail({
        inviterName,
        arenaName,
        inviteLink,
        userEmail: invitation.email
      })
    })
  } catch (error) {
    console.error("Failed to resend email", error)
    throw new Error("Failed to resend email")
  }
  
  revalidatePath(`/arenas/${invitation.arenaId}/members`)
}

