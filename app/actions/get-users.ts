"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSystemAdmin } from "@/lib/roles"
import { Role, ArenaRole } from "@prisma/client"

export async function getUsersAction(query: string = "", arenaId?: string) {
  const session = await auth()
  if (!session?.user) return []

  const isGlobalOrSystemAdmin = 
    session.user.role === Role.ADMIN || 
    session.user.role === Role.GLOBAL_ADMIN || 
    isSystemAdmin(session.user.email)

  // 1. Global Search (No Arena Context)
  // Only allowed for Global/System Admins
  if (!arenaId) {
    if (!isGlobalOrSystemAdmin) return []

    return prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ],
        NOT: {
          id: session.user.id
        }
      },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        image: true
      }
    })
  }

  // 2. Arena Scoped Search
  // Check if user has access to this arena
  const membership = await prisma.arenaMembership.findUnique({
    where: { userId_arenaId: { userId: session.user.id, arenaId } }
  })

  if (!membership && !isGlobalOrSystemAdmin) {
    return []
  }

  const isArenaAdmin = membership?.role === ArenaRole.ADMIN
  const canSeeHidden = isGlobalOrSystemAdmin || isArenaAdmin

  return prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } }
      ],
      NOT: {
        id: session.user.id
      },
      memberships: {
        some: {
          arenaId,
          hidden: canSeeHidden ? undefined : false
        }
      }
    },
    take: 10,
    select: {
      id: true,
      name: true,
      email: true,
      image: true
    }
  })
}
