import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { MarketCard } from "@/components/market/MarketCard"
import { MarketFilter } from "@/components/market/MarketFilter"
import { MarketSearch } from "@/components/market/MarketSearch"
import { Button } from "@/components/ui/button"
import { Link } from "@/lib/navigation"
import { redirect } from "next/navigation"
import { ArenaRole, Role } from "@prisma/client"
import { getTranslations } from 'next-intl/server';
import { Flame } from "lucide-react"

interface PageProps {
  searchParams: Promise<{ 
    status?: string | string[]
    show?: string
    filter?: string
    q?: string 
  }>
  params: Promise<{ arenaId: string }>
}

export default async function MarketsPage(props: PageProps) {
  const session = await auth()
  const t = await getTranslations('Markets');
  
  if (!session?.user) return redirect("/api/auth/signin")

  const { arenaId } = await props.params
  const searchParams = await props.searchParams
  
  // Check Admin Status and get points
  const membership = await prisma.arenaMembership.findUnique({
    where: { userId_arenaId: { userId: session.user.id, arenaId } },
    select: { role: true, points: true }
  })
  
  // Get Arena Settings
  const arenaSettings = await prisma.arenaSettings.findUnique({
     where: { arenaId },
     select: { tradingFeePercent: true }
  })

  // Cast to any to avoid linter error if types are outdated relative to schema
  const isAdmin = session.user.role === Role.ADMIN || 
                  (session.user.role as any) === "GLOBAL_ADMIN" || 
                  membership?.role === ArenaRole.ADMIN

  // Parse Filters
  const statusParam = searchParams.status
  const showParam = searchParams.show
  const legacyFilter = searchParams.filter
  const query = searchParams.q

  let statuses: string[] = []
  if (Array.isArray(statusParam)) statuses = statusParam
  else if (typeof statusParam === 'string') statuses = statusParam.split(',')
  else if (legacyFilter === 'resolved') statuses = ['resolved']
  else if (legacyFilter === 'pending') statuses = ['pending']
  else statuses = ['open'] // Default

  const showMyPositions = showParam === 'my-positions' || legacyFilter === 'my-positions'

  // Build OR clause for statuses
  const OR: any[] = []
  
  if (statuses.includes('open')) {
    OR.push({ 
      approved: true, 
      status: { in: ["OPEN", "PENDING_RESOLUTION"] } 
    })
  }
  
  if (statuses.includes('resolved')) {
    OR.push({ 
      approved: true, 
      status: "RESOLVED" 
    })
  }
  
  if (statuses.includes('pending') && isAdmin) {
    OR.push({ approved: false } as any)
  }

  const whereClause: any = {
    arenaId,
    hiddenUsers: {
      none: {
        id: session.user.id
      }
    },
    bets: showMyPositions ? {
      some: {
        userId: session.user.id
      }
    } : undefined
  }

  if (OR.length > 0) {
    whereClause.OR = OR
  } else {
    // If no valid status selected (e.g. user unchecked all, or selected only pending but is not admin)
    // Force empty result
    whereClause.id = "NO_MATCH"
  }

  // Apply Search
  if (query) {
    whereClause.AND = [
      {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      }
    ]
  }

  const includeConfig = {
       creator: true,
       options: true,
       assets: {
         where: { type: "IMAGE" } as const,
         take: 1
       },
       _count: {
         select: { bets: true }
       },
       // Fetch current user's bets for each market to display position
       bets: {
         where: {
           userId: session.user.id
         },
         include: {
           option: true
         }
       }
    }

  const markets = await prisma.market.findMany({
    where: whereClause,
    orderBy: {
      createdAt: 'desc'
    },
    include: includeConfig
  })

  // Fetch Trending Markets (Only if not searching and on default view)
  const isDefaultView = !query && !showMyPositions && statuses.length === 1 && statuses[0] === 'open'
  
  let trendingMarkets: typeof markets = []

  if (isDefaultView) {
      const recentCutoff = new Date()
      recentCutoff.setDate(recentCutoff.getDate() - 3)

      trendingMarkets = await prisma.market.findMany({
          where: {
              arenaId,
              status: "OPEN",
              approved: true,
              bets: {
                  some: {
                      createdAt: { gte: recentCutoff }
                  }
              },
              hiddenUsers: { none: { id: session.user.id } }
          } as any,
          orderBy: {
              bets: { _count: 'desc' }
          },
          take: 3,
          include: includeConfig
      })
  }

  const userPoints = membership?.points || 0
  const feePercent = (arenaSettings?.tradingFeePercent || 0) / 100

  // Filter out trending markets from main list to avoid duplication
  const trendingIds = new Set(trendingMarkets.map(m => m.id))
  const displayMarkets = markets.filter(m => !trendingIds.has(m.id))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <MarketSearch />
          <div className="flex items-center gap-2">
            <Link href={`/arenas/${arenaId}/markets/create`}>
                <Button>{t('createMarket')}</Button>
            </Link>
            <MarketFilter isAdmin={isAdmin} />
          </div>
        </div>
      </div>

      {/* Trending Section */}
      {trendingMarkets.length > 0 && (
          <div className="space-y-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-orange-600">
                  <Flame className="h-5 w-5 fill-orange-600" />
                  {t('trending')}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {trendingMarkets.map(market => (
                    <MarketCard 
                      key={market.id} 
                      market={{
                        ...market,
                        userBets: market.bets
                      }} 
                      isAdmin={isAdmin}
                      userPoints={userPoints}
                      feePercent={feePercent}
                    />
                  ))}
              </div>
              <div className="border-b my-6" />
          </div>
      )}

      {displayMarkets.length === 0 && trendingMarkets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {query ? (
             <p>{t('noMarkets')}</p>
          ) : showMyPositions ? (
            <p>{t('noPositions')}</p>
          ) : statuses.includes("pending") && statuses.length === 1 ? (
            <p>{t('noPending')}</p>
          ) : (
            <p>{t('noMarkets')}</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayMarkets.map(market => (
            <MarketCard 
              key={market.id} 
              market={{
                ...market,
                userBets: market.bets
              }} 
              isAdmin={isAdmin}
              userPoints={userPoints}
              feePercent={feePercent}
            />
          ))}
        </div>
      )}
    </div>
  )
}
