import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiRequest, apiResponse, apiError } from "@/lib/api-auth"

/**
 * GET /api/v1/invitations/[token]
 * Get invitation details (public - no auth required)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      arena: {
        select: {
          id: true,
          name: true,
          description: true,
          coverImage: true,
          logo: true,
        },
      },
      inviter: {
        select: {
          name: true,
          image: true,
        },
      },
    },
  })

  if (!invitation) {
    return apiError("Invalid invitation", 404)
  }

  const isUnlimited = invitation.usageLimit === null
  const isLimitReached = !isUnlimited && invitation.usageCount >= invitation.usageLimit!
  const isExpired = invitation.expiresAt < new Date()
  const isInvalidStatus = invitation.status !== "PENDING"

  if (isInvalidStatus || isExpired || isLimitReached) {
    return apiError(
      isLimitReached
        ? "This invitation has reached its usage limit"
        : "This invitation is no longer valid",
      410
    )
  }

  return apiResponse({
    arena: invitation.arena,
    inviter: {
      name: invitation.inviter.name || "Someone",
      image: invitation.inviter.image,
    },
    email: invitation.email, // null for public invites
  })
}

/**
 * POST /api/v1/invitations/[token]
 * Accept an invitation (requires authentication)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const authResult = await validateApiRequest(req)

  if ("error" in authResult) {
    return authResult.error
  }

  const { user } = authResult

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { arena: true },
  })

  if (!invitation) {
    return apiError("Invalid invitation", 404)
  }

  if (invitation.expiresAt < new Date()) {
    return apiError("Invitation expired", 410)
  }

  // Check usage limit
  const isUnlimited = invitation.usageLimit === null
  const hasRemainingUses =
    isUnlimited || invitation.usageCount < invitation.usageLimit!

  if (!hasRemainingUses) {
    return apiError("Invitation limit reached", 410)
  }

  if (invitation.status === "EXPIRED" || invitation.status === "DECLINED") {
    return apiError("Invitation is no longer valid", 410)
  }

  // Check if user matches the email (only if email is specified)
  if (
    invitation.email &&
    invitation.email.toLowerCase() !== user.email?.toLowerCase()
  ) {
    return apiError(
      `This invitation was sent to ${invitation.email}, but you are logged in as ${user.email}`,
      403
    )
  }

  // Check if already member
  const existing = await prisma.arenaMembership.findUnique({
    where: { userId_arenaId: { userId: user.id, arenaId: invitation.arenaId } },
  })

  if (existing) {
    // Already a member - just return success with the arena
    return apiResponse({
      message: "You are already a member of this arena",
      arena: {
        id: invitation.arena.id,
        name: invitation.arena.name,
      },
    })
  }

  // Create membership
  await prisma.arenaMembership.create({
    data: {
      userId: user.id,
      arenaId: invitation.arenaId,
      role: invitation.role,
      points: 1000,
    },
  })

  // Update invitation usage
  const newUsageCount = invitation.usageCount + 1
  const shouldClose = !isUnlimited && newUsageCount >= invitation.usageLimit!

  await prisma.$transaction([
    prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        usageCount: newUsageCount,
        status: shouldClose ? "ACCEPTED" : invitation.status,
      },
    }),
    prisma.invitationUsage.create({
      data: {
        invitationId: invitation.id,
        userId: user.id,
      },
    }),
  ])

  return apiResponse({
    message: "Successfully joined the arena",
    arena: {
      id: invitation.arena.id,
      name: invitation.arena.name,
    },
  })
}

