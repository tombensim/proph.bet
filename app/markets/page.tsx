import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { MarketCard } from "@/components/market/MarketCard"
import { MarketFilter } from "@/components/market/MarketFilter"
import { redirect } from "next/navigation"

interface PageProps {
  searchParams: Promise<{ filter?: string }>
}

export default async function MarketsPage(props: PageProps) {
  const session = await auth()
  if (!session?.user) return redirect("/api/auth/signin")

  const searchParams = await props.searchParams
  const filter = searchParams.filter

  const markets = await prisma.market.findMany({
    where: {
      hiddenUsers: {
        none: {
          id: session.user.id
        }
      },
      status: {
        in: ["OPEN", "PENDING_RESOLUTION"]
      },
      // Filter by user's bets if requested
      bets: filter === "my-positions" ? {
        some: {
          userId: session.user.id
        }
      } : undefined
    },
    orderBy: {
      createdAt: 'desc'
    },
    include: {
       creator: true,
       options: true,
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
        <h1 className="text-3xl font-bold">Active Markets</h1>
        <MarketFilter />
      </div>
      {markets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {filter === "my-positions" ? (
            <p>You don't have any open positions yet.</p>
          ) : (
            <p>No active markets found. Why not create one?</p>
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
            />
          ))}
        </div>
      )}
    </div>
  )
}
