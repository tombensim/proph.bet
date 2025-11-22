"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Role } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { s3Client, BUCKET_NAME } from "@/lib/s3"
import { HeadObjectCommand } from "@aws-sdk/client-s3"
import { isSystemAdmin } from "@/lib/roles"

// Helper to ensure admin access
async function requireAdmin() {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  // Allow system admin regardless of role
  if (isSystemAdmin(session.user.email)) {
    return
  }

  if (session.user.role !== Role.ADMIN) {
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
      select: {
        id: true,
        name: true,
        description: true,
        coverImage: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
        archivedAt: true,
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

  // Fetch LLM Usage for these arenas
  const arenaIds = arenas.map(a => a.id)
  const llmUsage = await prisma.lLMUsage.groupBy({
    by: ['arenaId'],
    where: {
      arenaId: { in: arenaIds }
    },
    _sum: {
      tokens: true
    },
    _count: {
      _all: true
    }
  })

  const arenasWithStorage = await Promise.all(arenas.map(async (arena) => {
    const files: string[] = []
    // @ts-ignore - coverImage exists in schema but client might be stale
    if (arena.coverImage) files.push(arena.coverImage)
    
    for (const market of arena.markets) {
      if (market.resolutionImage) files.push(market.resolutionImage)
      for (const asset of market.assets) {
        if (asset.url) files.push(asset.url)
      }
    }

    const sizes = await Promise.all(files.map(url => getObjectSize(url)))
    const totalSize = sizes.reduce((acc, size) => acc + size, 0)

    // Get LLM stats for this arena
    const usage = llmUsage.find(u => u.arenaId === arena.id)

    // Remove huge markets object from result to keep payload small
    const { markets, ...arenaData } = arena

    return {
      ...arenaData,
      storage: {
        count: files.length,
        size: totalSize
      },
      llm: {
        requests: usage?._count._all || 0,
        tokens: usage?._sum.tokens || 0
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

export async function getAnalyticsData() {
  await requireAdmin()

  // 1. Arena Stats
  const arenas = await prisma.arena.findMany({
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          members: true,
          markets: true
        }
      },
      markets: {
        select: {
          status: true
        }
      }
    }
  })

  const arenaTransactions = await prisma.transaction.groupBy({
    by: ['arenaId'],
    where: {
      type: 'BET_PLACED',
      arenaId: { not: null }
    },
    _sum: {
      amount: true
    },
    _count: {
      _all: true
    }
  })

  // Aggregate LLM usage by arena and type
  const llmUsage = await prisma.lLMUsage.groupBy({
    by: ['arenaId', 'type'],
    where: {
      arenaId: { not: null }
    },
    _count: {
      _all: true
    },
    _sum: {
      tokens: true
    }
  })

  const arenaStats = arenas.map(arena => {
    const txStats = arenaTransactions.find(tx => tx.arenaId === arena.id)
    const activeMarkets = arena.markets.filter(m => m.status === 'OPEN').length
    
    // LLM Stats
    const cronUsage = llmUsage.find(u => u.arenaId === arena.id && u.type === 'CRON')
    const userUsage = llmUsage.find(u => u.arenaId === arena.id && u.type === 'USER_TRIGGERED')

    return {
      id: arena.id,
      name: arena.name,
      totalMembers: arena._count.members,
      totalMarkets: arena._count.markets,
      activeMarkets,
      totalBets: txStats?._count._all || 0,
      totalVolume: txStats?._sum.amount || 0,
      llm: {
        cron: {
          count: cronUsage?._count._all || 0,
          tokens: cronUsage?._sum.tokens || 0
        },
        user: {
          count: userUsage?._count._all || 0,
          tokens: userUsage?._sum.tokens || 0
        }
      }
    }
  }).sort((a, b) => b.totalVolume - a.totalVolume)

  // 2. User Stats (Top 20 by bet count)
  const users = await prisma.user.findMany({
    take: 20,
    orderBy: {
      bets: {
        _count: 'desc'
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      _count: {
        select: {
          bets: true,
          createdMarkets: true
        }
      }
    }
  })

  const userIds = users.map(u => u.id)

  const winnings = await prisma.transaction.groupBy({
    by: ['toUserId'],
    where: {
      type: 'WIN_PAYOUT',
      toUserId: { in: userIds }
    },
    _sum: {
      amount: true
    }
  })

  const userStats = users.map(user => {
    const userWinnings = winnings.find(w => w.toUserId === user.id)
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      totalBets: user._count.bets,
      marketsCreated: user._count.createdMarkets,
      totalWon: userWinnings?._sum.amount || 0
    }
  })

  return {
    arenaStats,
    userStats
  }
}

export interface BillingReport {
  vercel: {
    bandwidth: number;
    functionInvocations: number;
    buildMinutes: number;
    costEstimate: number;
  };
  cloudflare: {
    storageUsed: number;
    classAOperations: number;
    classBOperations: number;
    costEstimate: number;
  };
  google: {
    totalCost: number;
    currency: string;
    services: {
      name: string;
      cost: number;
    }[];
  };
  timestamp: string;
}

export async function getBillingReport(from?: Date, to?: Date): Promise<BillingReport | null> {
  await requireAdmin();

  const workerUrl = process.env.BILLING_WORKER_URL;
  const accessToken = process.env.BILLING_WORKER_ACCESS_TOKEN;

  if (!workerUrl || !accessToken) {
    console.warn('Missing BILLING_WORKER_URL or BILLING_WORKER_ACCESS_TOKEN');
    return null;
  }

  const url = new URL(workerUrl);
  if (from) url.searchParams.set('from', from.toISOString());
  if (to) url.searchParams.set('to', to.toISOString());

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      next: { revalidate: 3600 } // Cache for 1 hour, or 0 if we want fresh
    });

    if (!res.ok) {
      throw new Error(`Billing worker returned ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Failed to fetch billing report:', error);
    return null;
  }
}
