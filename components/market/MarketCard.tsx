import { Market, User } from "@prisma/client"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

interface MarketWithDetails extends Market {
  creator: User
  _count: {
    bets: number
  }
}

export function MarketCard({ market }: { market: MarketWithDetails }) {
  return (
    <Link href={`/markets/${market.id}`}>
      <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer flex flex-col">
        <CardHeader>
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
        <CardContent className="mt-auto">
           <div className="text-sm text-muted-foreground">
             Created by {market.creator.name || "Unknown"}
           </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground flex justify-between border-t pt-4">
           <span>{market._count.bets} bets</span>
           <span>Ends {formatDistanceToNow(new Date(market.resolutionDate), { addSuffix: true })}</span>
        </CardFooter>
      </Card>
    </Link>
  )
}

