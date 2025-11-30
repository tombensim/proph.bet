import { prisma } from "@/lib/prisma"
import { ArenaRole } from "@prisma/client"
import { isSystemAdmin } from "@/lib/roles"

// Default analysts configuration
const DEFAULT_ANALYSTS = [
  {
    name: "Risk Taker",
    prompt: "You are a high-risk, high-reward trader. You love volatility and underdog stories. You get excited about big bets and dramatic swings. Your tone is energetic, slightly reckless, and momentum-driven. You often use trading slang."
  },
  {
    name: "Conservative Sage",
    prompt: "You are a risk-averse, seasoned investor. You value stability, historical trends, and logical probabilities. You are skeptical of hype and quick movements. Your tone is calm, professional, warning about downside risks, and focused on fundamentals."
  },
  {
    name: "Contrarian",
    prompt: "You always look for the counter-narrative. If everyone is buying, you are looking to sell. You are skeptical of the crowd wisdom and look for value in the unpopular opinion. Your tone is cynical, questioning, and provocative."
  }
]

export interface CreateArenaParams {
  userId: string
  userEmail: string
  userRole: string
  name: string
  description?: string
  slug: string
}

export interface CreateArenaResult {
  success: boolean
  arenaId?: string
  slug?: string
  error?: string
}

/**
 * Core arena creation logic - used by both server actions and API routes
 */
export async function createArena(params: CreateArenaParams): Promise<CreateArenaResult> {
  const { userId, userEmail, userRole, name, description, slug } = params

  const isSysAdmin = isSystemAdmin(userEmail)
  if (!isSysAdmin && userRole !== "ADMIN" && userRole !== "GLOBAL_ADMIN") {
    throw new Error("Unauthorized: Only system admins and global admins can create arenas")
  }

  // Check slug uniqueness
  const existing = await prisma.arena.findUnique({ where: { slug } })
  if (existing) throw new Error("Arena with this slug already exists")

  const arena = await prisma.arena.create({
    data: {
      name,
      description,
      slug,
      members: {
        create: {
          userId,
          role: ArenaRole.ADMIN,
          points: 1000 // Initial points for creator in new arena
        }
      },
      settings: {
        create: {
          limitMultipleBets: true,
          multiBetThreshold: 3,
          analysts: DEFAULT_ANALYSTS as any
        }
      }
    }
  })

  return { success: true, arenaId: arena.id, slug: arena.slug }
}

export interface GetArenasParams {
  userId?: string
}

/**
 * Get arenas for a user (member of) or all public arenas
 */
export async function getArenas(params: GetArenasParams = {}) {
  const { userId } = params

  if (userId) {
    // Get arenas the user is a member of
    const memberships = await prisma.arenaMembership.findMany({
      where: { userId },
      include: {
        arena: {
          include: {
            _count: {
              select: { members: true, markets: true }
            }
          }
        }
      }
    })

    return memberships.map(m => ({
      ...m.arena,
      membership: {
        role: m.role,
        points: m.points,
        joinedAt: m.joinedAt
      }
    }))
  }

  // Get all arenas (for discovery)
  const arenas = await prisma.arena.findMany({
    where: { archivedAt: null },
    include: {
      _count: {
        select: { members: true, markets: true }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  return arenas
}

/**
 * Get a single arena by ID or slug
 */
export async function getArena(idOrSlug: string) {
  const arena = await prisma.arena.findFirst({
    where: {
      OR: [
        { id: idOrSlug },
        { slug: idOrSlug }
      ]
    },
    include: {
      settings: true,
      _count: {
        select: { members: true, markets: true }
      }
    }
  })

  return arena
}

/**
 * Get user's membership in an arena
 */
export async function getArenaMembership(userId: string, arenaId: string) {
  const membership = await prisma.arenaMembership.findUnique({
    where: {
      userId_arenaId: { userId, arenaId }
    },
    include: {
      arena: true,
      notificationSettings: true
    }
  })

  return membership
}

/**
 * Get leaderboard for an arena
 */
export async function getArenaLeaderboard(arenaId: string, limit = 50) {
  const memberships = await prisma.arenaMembership.findMany({
    where: {
      arenaId,
      hidden: false
    },
    include: {
      user: {
        select: { id: true, name: true, image: true, email: true }
      }
    },
    orderBy: { points: "desc" },
    take: limit
  })

  return memberships.map((m, index) => ({
    rank: index + 1,
    userId: m.userId,
    user: m.user,
    points: m.points,
    role: m.role
  }))
}
