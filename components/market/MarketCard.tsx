import { Market, User, Bet, Option, MarketAsset } from "@prisma/client"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Link } from "@/lib/navigation"
import { formatDistanceToNow } from "date-fns"
import { Coins, AlertTriangle } from "lucide-react"
import { ApproveMarketButton } from "./ApproveMarketButton"

interface MarketWithDetails extends Market {
  creator: User
  options: Option[]
  _count: {
    bets: number
  }
  userBets?: (Bet & { option: Option | null })[]
  assets?: MarketAsset[]
}

export function MarketCard({ market, isAdmin }: { market: MarketWithDetails, isAdmin?: boolean }) {
  const hasPositions = market.userBets && market.userBets.length > 0
  const coverImage = market.assets?.find(a => a.type === "IMAGE")?.url
  const isPending = market.approved === false
  
  let probabilityDisplay = null
  
  if (market.type === "BINARY" && market.options.length >= 2) {
    const yesOption = market.options.find(o => o.text.toLowerCase() === "yes")
    const noOption = market.options.find(o => o.text.toLowerCase() === "no")
    
    if (yesOption && noOption) {
      const total = yesOption.liquidity + noOption.liquidity
      // Price(Yes) = No_Pool / (Yes_Pool + No_Pool)
      const yesPrice = noOption.liquidity / total
      const percent = Math.round(yesPrice * 100)
      
      probabilityDisplay = (
        <div className="flex items-center gap-2">
           <div className="text-2xl font-bold text-green-600">{percent}%</div>
           <div className="text-xs text-muted-foreground uppercase font-bold tracking-wide">Chance</div>
        </div>
      )
    }
  }

  const href = market.arenaId 
    ? `/arenas/${market.arenaId}/markets/${market.id}`
    : `/markets/${market.id}`

  return (
    <Link href={href}>
      <Card className={`h-full transition-all cursor-pointer flex flex-col overflow-hidden relative ${hasPositions ? 'border-blue-200 bg-blue-50/20' : 'hover:bg-muted/50'} ${isPending ? 'border-yellow-400 border-dashed bg-yellow-50/30' : ''}`}>
        {isPending && (
            <div className="absolute top-2 right-2 z-10">
                <Badge variant="destructive" className="gap-1 bg-yellow-500 hover:bg-yellow-600">
                    <AlertTriangle className="w-3 h-3" /> Pending
                </Badge>
            </div>
        )}
        {coverImage && (
          <div className="relative h-32 w-full overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={coverImage} 
              alt={market.title}
              className="object-cover w-full h-full transition-transform hover:scale-105 duration-500"
            />
          </div>
        )}
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-lg leading-tight">{market.title}</CardTitle>
            <Badge variant={market.type === "BINARY" ? "default" : "secondary"}>
              {market.type === "BINARY" ? "Yes/No" : market.type === "MULTIPLE_CHOICE" ? "Multi" : "Range"}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            {market.description}
          </div>
        </CardHeader>
        <CardContent className="mt-auto space-y-4">
           {/* Probability for Binary Markets */}
           {probabilityDisplay && (
             <div className="bg-background/50 p-3 rounded-lg border shadow-sm">
               {probabilityDisplay}
             </div>
           )}

           {/* User Positions Indicator */}
           {hasPositions && (
             <div className="flex flex-wrap gap-2">
               {market.userBets!.map(bet => (
                 <Badge key={bet.id} variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 flex items-center gap-1 text-xs">
                   <Coins className="h-3 w-3" />
                  {bet.option?.text || bet.numericValue || "Bet"}
                  <span className="ms-1 opacity-70">({bet.amount})</span>
                </Badge>
               ))}
             </div>
           )}

           <div className="text-sm text-muted-foreground flex items-center gap-2">
             Created by {market.creator.name || "Unknown"}
           </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground flex justify-between border-t pt-4">
           <span>{market._count.bets} bets</span>
           <span>Ends {formatDistanceToNow(new Date(market.resolutionDate), { addSuffix: true })}</span>
        </CardFooter>
        
        {isPending && isAdmin && market.arenaId && (
            <div className="p-2 border-t bg-yellow-100/50">
                <ApproveMarketButton marketId={market.id} arenaId={market.arenaId} />
            </div>
        )}
      </Card>
    </Link>
  )
}
