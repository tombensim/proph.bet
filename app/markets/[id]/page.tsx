import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BetForm } from "./bet-form"
import { ResolveMarketForm } from "./resolve-form"
import { Separator } from "@/components/ui/separator"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MarketPage(props: PageProps) {
  const params = await props.params;
  const session = await auth()
  if (!session?.user?.id) return redirect("/api/auth/signin")

  const market = await prisma.market.findUnique({
    where: { id: params.id },
    include: {
      creator: true,
      options: true,
      bets: {
        include: { user: true, option: true },
        orderBy: { createdAt: 'desc' }
      },
      hiddenUsers: {
         select: { id: true }
      }
    }
  })

  if (!market) notFound()

  // Check visibility
  if (market.hiddenUsers.some(u => u.id === session.user!.id)) {
     return (
       <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
         <div className="p-4 rounded-full bg-muted">
           <span className="text-4xl">🔒</span>
         </div>
         <h1 className="text-xl font-bold">This market is hidden from you</h1>
         <p className="text-muted-foreground">You cannot view details or bet on this market.</p>
       </div>
     )
  }

  // Get current user points
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { points: true }
  })
  
  const isCreator = market.creatorId === session.user.id
  const totalPool = market.bets.reduce((acc, bet) => acc + bet.amount, 0)

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
             <Badge>{market.type}</Badge>
             {market.status === "OPEN" ? (
               <Badge variant="outline" className="text-green-600 border-green-600">Open</Badge>
             ) : (
               <Badge variant="destructive">Closed</Badge>
             )}
          </div>
          <h1 className="text-3xl font-bold mb-2">{market.title}</h1>
          <div className="text-muted-foreground whitespace-pre-wrap">
            {market.description}
          </div>
        </div>

        {/* Resolution Interface for Creator */}
        {isCreator && market.status === "OPEN" && (
           <div className="mb-6">
              <ResolveMarketForm market={market} />
           </div>
        )}

        <Separator />

        <div>
           <h3 className="font-semibold mb-4">Recent Activity</h3>
           <div className="space-y-4">
             {market.bets.length === 0 ? (
               <p className="text-sm text-muted-foreground">No bets placed yet.</p>
             ) : (
               market.bets.map(bet => (
                 <div key={bet.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <div className="flex flex-col">
                       <span className="font-medium">{bet.user.name || "Anonymous"}</span>
                       <span className="text-xs text-muted-foreground">
                         {bet.option?.text ? `Bet on "${bet.option.text}"` : 
                          bet.numericValue ? `Predicted ${bet.numericValue}` : "Placed a bet"}
                       </span>
                    </div>
                    <span className="font-mono font-medium">+{bet.amount} pts</span>
                 </div>
               ))
             )}
           </div>
        </div>
      </div>

      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Place Your Bet</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="mb-6 p-4 bg-muted rounded-lg text-center">
                <div className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Total Pool</div>
                <div className="text-2xl font-bold">{totalPool} pts</div>
             </div>
             
             <div className="mb-4 text-sm text-muted-foreground">
                Resolves on: <span className="font-medium text-foreground">{format(market.resolutionDate, "PPP")}</span>
             </div>

             {market.status === "OPEN" && (
                <BetForm market={market} userPoints={user?.points || 0} />
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

