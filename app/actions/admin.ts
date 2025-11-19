"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Role } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { s3Client, BUCKET_NAME } from "@/lib/s3"
import { HeadObjectCommand } from "@aws-sdk/client-s3"

// Helper to ensure admin access
async function requireAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized")
  }
}

async function getObjectSize(url: string): Promise<number> {
  try {
    // Parse key from URL
    const urlObj = new URL(url)
    let key = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname
    
    // If path starts with bucket name, remove it
    if (key.startsWith(`${BUCKET_NAME}/`)) {
      key = key.slice(BUCKET_NAME.length + 1)
    }
    
    // Optimization: If URL is empty or invalid, return 0
    if (!key) return 0

    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    const response = await s3Client.send(command)
    return response.ContentLength || 0
  } catch (error) {
    // File might not exist or access denied
    return 0
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

export async function getAllArenas(page = 1, limit = 20, excludeArchived = true) {
  await requireAdmin()

  const skip = (page - 1) * limit
  const where: any = {}
  if (excludeArchived) {
    where.archivedAt = null
  }
  
  const [arenas, total] = await Promise.all([
    prisma.arena.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            members: true,
            markets: true
          }
        },
        markets: {
          select: {
            resolutionImage: true,
            assets: {
              select: {
                url: true
              }
            }
          }
        }
      }
    }),
    prisma.arena.count({ where })
  ])

  const arenasWithStorage = await Promise.all(arenas.map(async (arena) => {
    const files: string[] = []
    if (arena.coverImage) files.push(arena.coverImage)
    
    for (const market of arena.markets) {
      if (market.resolutionImage) files.push(market.resolutionImage)
      for (const asset of market.assets) {
        if (asset.url) files.push(asset.url)
      }
    }

    const sizes = await Promise.all(files.map(url => getObjectSize(url)))
    const totalSize = sizes.reduce((acc, size) => acc + size, 0)

    // Remove huge markets object from result to keep payload small
    const { markets, ...arenaData } = arena

    return {
      ...arenaData,
      storage: {
        count: files.length,
        size: totalSize
      }
    }
  }))

  return { arenas: arenasWithStorage, total, pages: Math.ceil(total / limit) }
}

export async function updateUserRole(userId: string, role: Role) {
  await requireAdmin()
  
  await prisma.user.update({
    where: { id: userId },
    data: { role }
  })
  
  revalidatePath("/admin/users")
}
