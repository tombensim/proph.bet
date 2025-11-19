"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export type SearchResult = {
  arenas: Array<{
    id: string
    name: string
    description: string | null
    slug: string
  }>
  markets: Array<{
    id: string
    title: string
    description: string | null
    arena: {
      name: string
      slug: string
      id: string
    } | null
  }>
}

export async function searchCommandPalette(query: string): Promise<SearchResult> {
  const session = await auth()
  if (!session?.user) {
    return { arenas: [], markets: [] }
  }

  if (!query || query.length < 2) {
    // Return recent/default items if query is empty or too short
    // For now, we'll just return user's arenas
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
        slug: m.arena.slug
      })),
      markets: []
    }
  }

  // Search Arenas (User is member of)
  const arenas = await prisma.arena.findMany({
    where: {
      members: { some: { userId: session.user.id } },
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ]
    },
    take: 5,
    select: {
      id: true,
      name: true,
      description: true,
      slug: true
    }
  })

  // Search Markets (In arenas user is member of)
  const markets = await prisma.market.findMany({
    where: {
      arena: {
        members: { some: { userId: session.user.id } }
      },
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
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

  return { arenas, markets }
}

