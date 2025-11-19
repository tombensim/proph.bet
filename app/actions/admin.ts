"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Role } from "@prisma/client"
import { redirect } from "next/navigation"

// Helper to ensure admin access
async function requireAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized")
  }
}

export async function getSystemStats() {
  await requireAdmin()

  const [
    totalUsers,
    totalArenas,
    totalMarkets,
    totalBets,
    totalVolume
  ] = await Promise.all([
    prisma.user.count(),
    prisma.arena.count(),
    prisma.market.count(),
    prisma.bet.count(),
    prisma.transaction.aggregate({
      _sum: {
        amount: true
      },
      where: {
        type: "BET_PLACED"
      }
    })
  ])

  return {
    totalUsers,
    totalArenas,
    totalMarkets,
    totalBets,
    totalVolume: totalVolume._sum.amount || 0
  }
}

export async function getAllUsers(page = 1, limit = 20, search = "") {
  await requireAdmin()

  const skip = (page - 1) * limit
  const where: any = search ? {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ]
  } : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            createdMarkets: true,
            bets: true
          }
        }
      }
    }),
    prisma.user.count({ where })
  ])

  return { users, total, pages: Math.ceil(total / limit) }
}

export async function getAllArenas(page = 1, limit = 20) {
  await requireAdmin()

  const skip = (page - 1) * limit
  
  const [arenas, total] = await Promise.all([
    prisma.arena.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            members: true,
            markets: true
          }
        }
      }
    }),
    prisma.arena.count()
  ])

  return { arenas, total, pages: Math.ceil(total / limit) }
}

