import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { syncPolymarketResolutionAction } from "@/app/actions/sync-polymarket-resolution"

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  
  // Basic CRON security (if configured)
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    // Find all Polymarket markets that are not yet resolved
    const markets = await prisma.market.findMany({
      where: {
        source: "POLYMARKET",
        status: { not: "RESOLVED" },
        polymarketId: { not: null }
      },
      select: {
        id: true,
        title: true,
        polymarketId: true
      }
    })

    console.log(`Found ${markets.length} unresolved Polymarket markets to check`)

    // Process each market
    const results = await Promise.allSettled(
      markets.map(async (market) => {
        try {
          const result = await syncPolymarketResolutionAction(market.id)
          return {
            marketId: market.id,
            title: market.title,
            polymarketId: market.polymarketId,
            ...result
          }
        } catch (error) {
          return {
            marketId: market.id,
            title: market.title,
            polymarketId: market.polymarketId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })
    )

    // Categorize results
    const resolved: any[] = []
    const notReady: any[] = []
    const errors: any[] = []

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const data = result.value
        if (data.success) {
          resolved.push(data)
        } else if (data.error?.includes('not yet') || data.error?.includes('not yet clear')) {
          notReady.push(data)
        } else {
          errors.push(data)
        }
      } else {
        errors.push({
          error: result.reason?.message || 'Unknown error',
          success: false
        })
      }
    })

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      total: markets.length,
      resolved: resolved.length,
      notReady: notReady.length,
      errors: errors.length,
      details: {
        resolved: resolved.map(r => ({ 
          marketId: r.marketId, 
          title: r.title,
          message: r.message 
        })),
        notReady: notReady.map(r => ({ 
          marketId: r.marketId, 
          title: r.title,
          reason: r.error 
        })),
        errors: errors.map(e => ({ 
          marketId: e.marketId, 
          title: e.title,
          error: e.error 
        }))
      }
    }

    console.log('Polymarket resolution cron summary:', summary)

    return NextResponse.json(summary)
  } catch (error) {
    console.error("Polymarket resolution cron job failed:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal Server Error" 
      }, 
      { status: 500 }
    )
  }
}

