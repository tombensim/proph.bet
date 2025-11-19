import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Link } from "@/lib/navigation"
import { redirect } from "next/navigation"
import { format } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface PageProps {
  params: Promise<{ arenaId: string }>
}

export default async function HistoryPage(props: PageProps) {
  const session = await auth()
  if (!session?.user) return redirect("/api/auth/signin")

  const { arenaId } = await props.params

  const closedMarkets = await prisma.market.findMany({
    where: {
      arenaId,
      status: "RESOLVED",
      bets: {
        some: {
          userId: session.user.id
        }
      }
    },
    include: {
      options: true,
      bets: {
        where: { userId: session.user.id },
        include: { option: true }
      },
      transactions: {
        where: { 
          type: "WIN_PAYOUT",
          toUserId: session.user.id
        }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  })

  const totalInvested = closedMarkets.reduce((acc, market) => {
    const marketInvested = market.bets.reduce((sum, bet) => sum + bet.amount, 0)
    return acc + marketInvested
  }, 0)

  const totalPayout = closedMarkets.reduce((acc, market) => {
    const marketPayout = market.transactions.reduce((sum, tx) => sum + tx.amount, 0)
    return acc + marketPayout
  }, 0)

  const totalPnL = totalPayout - totalInvested

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Betting History</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvested.toLocaleString()} pts</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+{totalPayout.toLocaleString()} pts</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit / Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalPnL > 0 ? '+' : ''}{totalPnL.toLocaleString()} pts
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Market</TableHead>
              <TableHead>Resolution</TableHead>
              <TableHead>Your Bets</TableHead>
              <TableHead className="text-end">Invested</TableHead>
              <TableHead className="text-end">Payout</TableHead>
              <TableHead className="text-end">P/L</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {closedMarkets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">
                  No closed positions found.
                </TableCell>
              </TableRow>
            ) : (
              closedMarkets.map((market) => {
                const invested = market.bets.reduce((sum, bet) => sum + bet.amount, 0)
                // Note: This relies on the new marketId field in transactions. 
                // Old transactions won't show up here, so old markets might look like 100% loss.
                const payout = market.transactions.reduce((sum, tx) => sum + tx.amount, 0)
                const pnl = payout - invested
                
                let resolutionText = "Resolved"
                if (market.winningOptionId) {
                  const winningOption = market.options.find(o => o.id === market.winningOptionId)
                  if (winningOption) resolutionText = winningOption.text
                } else if (market.winningValue !== null) {
                  resolutionText = `Value: ${market.winningValue}`
                }

                return (
                  <TableRow key={market.id}>
                    <TableCell className="font-medium">
                      <Link href={`/arenas/${arenaId}/markets/${market.id}`} className="hover:underline">
                        {market.title}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(market.updatedAt), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {resolutionText}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {market.bets.map(bet => (
                          <span key={bet.id} className="text-xs">
                             {bet.option?.text || `Numeric: ${bet.numericValue}`} ({bet.amount})
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-end">{invested}</TableCell>
                    <TableCell className="text-end text-green-600">
                      {payout > 0 ? `+${payout}` : '-'}
                    </TableCell>
                    <TableCell className={`text-end font-bold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pnl > 0 ? '+' : ''}{pnl}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
