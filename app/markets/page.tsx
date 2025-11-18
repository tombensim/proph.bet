import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { MarketCard } from "@/components/market/MarketCard"
import { redirect } from "next/navigation"

export default async function MarketsPage() {
  const session = await auth()
  if (!session?.user) return redirect("/api/auth/signin")

  const markets = await prisma.market.findMany({
    where: {
      hiddenUsers: {
        none: {
          id: session.user.id
        }
      },
      status: {
        in: ["OPEN", "PENDING_RESOLUTION"]
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    include: {
       creator: true,
       _count: {
         select: { bets: true }
       }
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Active Markets</h1>
      </div>
      {markets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No active markets found. Why not create one?
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {markets.map(market => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}
    </div>
  )
}

