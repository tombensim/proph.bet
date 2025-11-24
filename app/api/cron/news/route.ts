import { prisma } from "@/lib/prisma"
import { refreshArenaNews } from "@/app/actions/arena-news"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic' // static by default, unless reading the request

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  
  // Basic CRON security (if configured)
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const arenas = await prisma.arena.findMany({
      where: { archivedAt: null },
      select: { id: true }
    })

    const results = await Promise.allSettled(
      arenas.map(arena => refreshArenaNews(arena.id))
    )

    const successes = results.filter(r => r.status === 'fulfilled').length
    const failures = results.filter(r => r.status === 'rejected').length

    return NextResponse.json({ 
      success: true, 
      updated: successes,
      failures
    })
  } catch (error) {
    console.error("Cron job failed:", error)
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
}

