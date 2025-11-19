import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { MarketCard } from "@/components/market/MarketCard"
import { MarketFilter } from "@/components/market/MarketFilter"
import { Button } from "@/components/ui/button"
import { Link } from "@/lib/navigation"
import { redirect } from "next/navigation"
import { ArenaRole, Role } from "@prisma/client"
import { getTranslations } from 'next-intl/server';

interface PageProps {
  searchParams: Promise<{ 
    status?: string | string[]
    show?: string
    filter?: string 
  }>
  params: Promise<{ arenaId: string }>
}

export default async function MarketsPage(props: PageProps) {
  const session = await auth()
  const t = await getTranslations('Markets');
  
  if (!session?.user) return redirect("/api/auth/signin")

  const { arenaId } = await props.params
  const searchParams = await props.searchParams
  
  // Check Admin Status
  const membership = await prisma.arenaMembership.findUnique({
    where: { userId_arenaId: { userId: session.user.id, arenaId } }
  })
  const isAdmin = session.user.role === Role.ADMIN || 
                  session.user.role === Role.GLOBAL_ADMIN || 
                  membership?.role === ArenaRole.ADMIN

  // Parse Filters
  const statusParam = searchParams.status
  const showParam = searchParams.show
  const legacyFilter = searchParams.filter

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
    OR.push({ approved: false })
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

  const markets = await prisma.market.findMany({
    where: whereClause,
    orderBy: {
      createdAt: 'desc'
    },
    include: {
       creator: true,
       options: true,
       assets: {
         where: { type: "IMAGE" },
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
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <div className="flex items-center gap-4">
          <Link href={`/arenas/${arenaId}/markets/create`}>
            <Button>{t('createMarket')}</Button>
          </Link>
          <MarketFilter isAdmin={isAdmin} />
        </div>
      </div>
      {markets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {showMyPositions ? (
            <p>{t('noPositions')}</p>
          ) : statuses.includes("pending") && statuses.length === 1 ? (
            <p>{t('noPending')}</p>
          ) : (
            <p>{t('noMarkets')}</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {markets.map(market => (
            <MarketCard 
              key={market.id} 
              market={{
                ...market,
                userBets: market.bets
              }} 
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  )
}
