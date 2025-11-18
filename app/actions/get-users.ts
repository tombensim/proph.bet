"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function getUsersAction(query: string = "") {
  const session = await auth()
  if (!session?.user) return []

  return prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } }
      ],
      NOT: {
        id: session.user.id // Exclude self
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

