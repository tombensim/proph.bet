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
  searchParams: Promise<{ filter?: string }>
  params: Promise<{ arenaId: string }>
}

export default async function MarketsPage(props: PageProps) {
  const session = await auth()
  const t = await getTranslations('Markets');
  
  if (!session?.user) return redirect("/api/auth/signin")

  const { arenaId } = await props.params
  const searchParams = await props.searchParams
  const filter = searchParams.filter

  // Check Admin Status
  const membership = await prisma.arenaMembership.findUnique({
    where: { userId_arenaId: { userId: session.user.id, arenaId } }
  })
  const isAdmin = session.user.role === Role.ADMIN || 
                  session.user.role === Role.GLOBAL_ADMIN || 
                  membership?.role === ArenaRole.ADMIN

  const whereClause: any = {
    arenaId,
    hiddenUsers: {
      none: {
        id: session.user.id
      }
    },
    status: filter === "resolved" ? "RESOLVED" : {
      in: ["OPEN", "PENDING_RESOLUTION"]
    },
    bets: filter === "my-positions" ? {
      some: {
        userId: session.user.id
      }
    } : undefined
  }

  // Filter Logic for Approval
  if (filter === "pending") {
    if (!isAdmin) {
        // If user tries to access pending but isn't admin, just show nothing or redirect
        whereClause.approved = false 
        whereClause.status = "OPEN" // Only show open pending markets?
    } else {
        whereClause.approved = false
    }
  } else {
    // Default view: Show approved only. Admin can switch filter to see pending.
    // Or maybe admins see pending mixed in? Let's stick to strict approved unless filter=pending
    whereClause.approved = true
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
          {filter === "my-positions" ? (
            <p>{t('noPositions')}</p>
          ) : filter === "pending" ? (
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
