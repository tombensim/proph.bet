"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ArenaRole } from "@prisma/client"

export type SearchResult = {
  arenas: Array<{
    id: string
    name: string
    description: string | null
    slug: string
    role: ArenaRole
  }>
  markets: Array<{
    id: string
    title: string
    description: string | null
    arena: {
      id: string
      name: string
      slug: string
    } | null
  }>
  actions: Array<{
    type: "create_market" | "settings" | "leaderboard"
    arenaId: string
    arenaName: string
  }>
}

export async function searchCommandPalette(query: string): Promise<SearchResult> {
  const session = await auth()
  if (!session?.user) {
    return { arenas: [], markets: [], actions: [] }
  }

  // Default Result (Recent Arenas)
  if (!query || query.length < 2) {
    const memberships = await prisma.arenaMembership.findMany({
      where: { userId: session.user.id },
      include: { arena: true },
      take: 5,
      orderBy: { joinedAt: 'desc' }
    })

    return {
      arenas: memberships.map(m => ({
        id: m.arena.id,
        name: m.arena.name,
        description: m.arena.description,
        slug: m.arena.slug,
        role: m.role
      })),
      markets: [],
      actions: []
    }
  }

  const lowerQuery = query.toLowerCase()
  const isActionQuery = lowerQuery.startsWith("create") || lowerQuery.startsWith("settings")
  let searchQuery = query
  let actionType: "create_market" | "settings" | null = null

  if (lowerQuery.startsWith("create")) {
    searchQuery = lowerQuery.replace("create", "").trim()
    actionType = "create_market"
  } else if (lowerQuery.startsWith("settings")) {
    searchQuery = lowerQuery.replace("settings", "").trim()
    actionType = "settings"
  }

  // Search Arenas (User is member of)
  // If searching for actions, we might want to broaden or narrow based on intent
  // For now, searching arenas normally is fine
  const arenas = await prisma.arena.findMany({
    where: {
      members: { some: { userId: session.user.id } },
      OR: [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } }
      ]
    },
    take: 5,
    include: {
      members: {
        where: { userId: session.user.id },
        select: { role: true }
      }
    }
  })

  const mappedArenas = arenas.map(a => ({
    id: a.id,
    name: a.name,
    description: a.description,
    slug: a.slug,
    role: a.members[0]?.role ?? ArenaRole.MEMBER
  }))

  // Search Markets (In arenas user is member of)
  // Skip market search if we are explicitly looking for settings/creation
  let markets: SearchResult['markets'] = []
  
  if (!actionType) {
    const marketsData = await prisma.market.findMany({
      where: {
        arena: {
          members: { some: { userId: session.user.id } }
        },
        OR: [
          { title: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } }
        ],
        status: { in: ["OPEN", "PENDING_RESOLUTION"] }
      },
      take: 10,
      select: {
        id: true,
        title: true,
        description: true,
        arena: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })
    markets = marketsData
  }

  // Generate Actions
  const actions: SearchResult['actions'] = []
  
  if (actionType === "create_market") {
    mappedArenas.forEach(arena => {
      actions.push({
        type: "create_market",
        arenaId: arena.id,
        arenaName: arena.name
      })
    })
  } else if (actionType === "settings") {
    mappedArenas.forEach(arena => {
      if (arena.role === "ADMIN") {
        actions.push({
          type: "settings",
          arenaId: arena.id,
          arenaName: arena.name
        })
      }
    })
  }

  return { arenas: actionType ? [] : mappedArenas, markets, actions }
}
