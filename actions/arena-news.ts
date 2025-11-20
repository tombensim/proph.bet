"use server"

import { prisma } from "@/lib/prisma"
import { generateArenaNews } from "@/lib/gemini"
import { revalidatePath } from "next/cache"

export async function refreshArenaNews(arenaId: string) {
  const arena = await prisma.arena.findUnique({
    where: { id: arenaId },
    select: { name: true }
  })

  if (!arena) {
    throw new Error("Arena not found")
  }

  // 1. Fetch Active Markets (Top 5 by bet count)
  const activeMarkets = await prisma.market.findMany({
    where: {
      arenaId,
      status: "OPEN",
      hiddenUsers: { none: {} }
    },
    orderBy: {
      bets: {
        _count: "desc"
      }
    },
    take: 5,
    select: {
      title: true,
      _count: {
        select: { bets: true }
      }
    }
  })

  // 2. Fetch Recent Big Bets (Last 24h, Top 5 by amount)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentBets = await prisma.bet.findMany({
    where: {
      market: { 
        arenaId,
        hiddenUsers: { none: {} }
      },
      createdAt: { gte: yesterday }
    },
    orderBy: {
      amount: "desc"
    },
    take: 5,
    include: {
      market: { select: { title: true } },
      option: { select: { text: true } }
    }
  })

  // 3. Fetch Recently Resolved Markets
  const resolvedMarkets = await prisma.market.findMany({
    where: {
      arenaId,
      status: "RESOLVED",
      updatedAt: { gte: yesterday },
      hiddenUsers: { none: {} }
    },
    take: 3,
    select: {
      title: true,
      winningOptionId: true,
      winningValue: true,
      type: true,
      options: true
    }
  })

  // Transform data for AI
  const activeMarketsData = activeMarkets.map(m => ({
    title: m.title,
    volume: m._count.bets
  }))

  const recentBetsData = recentBets.map(b => ({
    marketTitle: b.market.title,
    amount: b.amount,
    option: b.option?.text
  }))

  const resolvedMarketsData = resolvedMarkets.map(m => {
    let outcome = "Resolved"
    if (m.type === "BINARY" || m.type === "MULTIPLE_CHOICE") {
      const winner = m.options.find(o => o.id === m.winningOptionId)
      if (winner) outcome = winner.text
    } else if (m.type === "NUMERIC_RANGE") {
      outcome = m.winningValue?.toString() || "N/A"
    }
    return {
      title: m.title,
      outcome
    }
  })

  // Generate Headlines
  const headlines = await generateArenaNews({
    arenaName: arena.name,
    activeMarkets: activeMarketsData,
    recentBets: recentBetsData,
    resolvedMarkets: resolvedMarketsData,
    context: {
        arenaId,
    }
  })

  // Save to Database
  await prisma.arenaNews.create({
    data: {
      arenaId,
      headlines
    }
  })

  // Cleanup old news (keep last 10 entries for history/debugging)
  // Using a raw query or separate delete for simplicity in Prisma
  const newsCount = await prisma.arenaNews.count({ where: { arenaId } })
  if (newsCount > 10) {
    const oldestNews = await prisma.arenaNews.findMany({
        where: { arenaId },
        orderBy: { createdAt: 'asc' },
        take: newsCount - 10,
        select: { id: true }
    })
    
    if (oldestNews.length > 0) {
        await prisma.arenaNews.deleteMany({
            where: {
                id: { in: oldestNews.map(n => n.id) }
            }
        })
    }
  }

  revalidatePath(`/arenas/${arenaId}`)
  return headlines
}
