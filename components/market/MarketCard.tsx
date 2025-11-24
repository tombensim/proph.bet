"use client"

import { Market, User, Bet, Option, MarketAsset, AnalystSentiment } from "@prisma/client"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Link } from "@/lib/navigation"
import { formatDistanceToNow } from "date-fns"
import { Coins, AlertTriangle, Zap, Bot, TrendingUp, TrendingDown, ExternalLink } from "lucide-react"
import { ApproveMarketButton } from "./ApproveMarketButton"
import { useTranslations } from 'next-intl';
import { generateGradient } from "@/lib/utils"
import { ShareMarketButton } from "./ShareMarketButton"
import { BetForm } from "./BetForm"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useState } from "react"

interface MarketWithDetails extends Market {
  creator: User
  options: Option[]
  _count: {
    bets: number
  }
  userBets?: (Bet & { option: Option | null })[]
  assets?: MarketAsset[]
  analystSentiments?: AnalystSentiment[]
}

interface MarketCardProps {
  market: MarketWithDetails
  isAdmin?: boolean
  userPoints?: number
  feePercent?: number
}

export function MarketCard({ market, isAdmin, userPoints = 0, feePercent = 0 }: MarketCardProps) {
  const t = useTranslations('Markets');
  const hasPositions = market.userBets && market.userBets.length > 0
  const coverImage = market.assets?.find(a => a.type === "IMAGE")?.url
  const isPending = market.approved === false
  const isExpired = market.status === 'OPEN' && new Date() > new Date(market.resolutionDate)
  const [isBetOpen, setIsBetOpen] = useState(false)
  
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
           <div className="text-xs text-muted-foreground uppercase font-bold tracking-wide">{t('chance')}</div>
        </div>
      )
    }
  }

  // Determine dominant sentiment
  const latestSentiment = market.analystSentiments && market.analystSentiments.length > 0 
    ? market.analystSentiments[0] // Assuming sorted or just taking first
    : null;

  const href = market.arenaId 
    ? `/arenas/${market.arenaId}/markets/${market.id}`
    : `/markets/${market.id}`

  return (
    <Card className={`h-full transition-all flex flex-col overflow-hidden relative group hover:shadow-md ${hasPositions ? 'border-blue-200 bg-blue-50/20' : ''} ${isPending ? 'border-yellow-400 border-dashed bg-yellow-50/30' : ''}`}>
      {/* Navigation Link Overlay */}
      <Link href={href} className="absolute inset-0 z-0 focus:outline-none">
         <span className="sr-only">{market.title}</span>
      </Link>

      {isPending && (
          <div className="absolute top-2 end-2 z-10">
              <Badge variant="destructive" className="gap-1 bg-yellow-500 hover:bg-yellow-600">
                  <AlertTriangle className="w-3 h-3" /> {t('pendingApproval')}
              </Badge>
          </div>
      )}

      {isExpired && !isPending && (
        <div className="absolute top-2 end-2 z-10">
             <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-800 border-orange-200 shadow-sm">
                 Expired
             </Badge>
        </div>
      )}
      
      {/* Analyst Badge Overlay */}
      {latestSentiment && (
        <div className="absolute top-2 left-2 z-10">
             <Badge variant="secondary" className="gap-1 bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200 shadow-sm">
                <Bot className="w-3 h-3" /> 
                {latestSentiment.rating.replace("_", " ")}
            </Badge>
        </div>
      )}

      {/* Polymarket Badge Overlay */}
      {market.source === "POLYMARKET" && market.polymarketId && (
        <a 
          href={`https://polymarket.com/market/${market.polymarketId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 left-2 z-10 pointer-events-auto"
          style={{ marginTop: latestSentiment ? '2.5rem' : '0' }}
          onClick={(e) => e.stopPropagation()}
        >
             <Badge variant="secondary" className="gap-1 bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 shadow-sm cursor-pointer">
                <ExternalLink className="w-3 h-3" /> 
                {t('polymarket')}
            </Badge>
        </a>
      )}

      {/* Content Section - Pointer events passed through to Link unless caught */}
      <div className="flex flex-col flex-1 pointer-events-none min-h-0"> 
        {coverImage ? (
          <div className="relative h-32 w-full overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={coverImage} 
              alt={market.title}
              className="object-cover object-[center_30%] w-full h-full transition-transform group-hover:scale-105 duration-500"
            />
          </div>
        ) : (
          <div 
            className="relative h-32 w-full overflow-hidden"
            style={{ background: generateGradient(market.id) }}
          />
        )}
        <CardHeader className="pt-4 pb-3 relative z-10">
          <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-lg leading-tight line-clamp-2 min-h-[3rem]" title={market.title}>{market.title}</CardTitle>
            <Badge variant={market.type === "BINARY" ? "default" : "secondary"}>
              {market.type === "BINARY" ? "Yes/No" : market.type === "MULTIPLE_CHOICE" ? "Multi" : "Range"}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            {market.description}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 relative z-10">
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
             {t('createdBy', { name: market.creator.name || "Unknown" })}
           </div>
        </CardContent>
      </div>
      
      <CardFooter className="text-xs text-muted-foreground flex justify-between items-center border-t p-3 relative z-20 pointer-events-auto bg-card">
          <div className="flex flex-col sm:flex-row sm:gap-3 gap-1 min-w-0 flex-1 mr-2">
             <span className="truncate">{t('betsCount', { count: market._count.bets })}</span>
             <span className="hidden sm:inline text-muted-foreground/50">•</span>
             <span className="truncate">{formatDistanceToNow(new Date(market.resolutionDate), { addSuffix: true })}</span>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <ShareMarketButton 
                marketTitle={market.title} 
                url={href}
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
            />

            {market.status === "OPEN" && !isPending && (
                isExpired ? (
                    <Button size="sm" variant="secondary" disabled className="h-9 px-4 shadow-sm shrink-0 font-medium opacity-70">
                        Expired
                    </Button>
                ) : (
                    <Dialog open={isBetOpen} onOpenChange={setIsBetOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" variant="default" className="h-9 px-4 shadow-sm shrink-0 font-medium">
                                <Zap className="w-3.5 h-3.5 mr-1.5 fill-current" />
                                Bet
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]" onClick={(e) => e.stopPropagation()}>
                            <DialogHeader>
                                <DialogTitle>{market.title}</DialogTitle>
                            </DialogHeader>
                            <BetForm 
                                market={market}
                                userPoints={userPoints}
                                feePercent={feePercent}
                            />
                        </DialogContent>
                    </Dialog>
                )
            )}
          </div>
      </CardFooter>
      
      {isPending && isAdmin && market.arenaId && (
          <div className="p-2 border-t bg-yellow-100/50 relative z-20 pointer-events-auto">
              <ApproveMarketButton marketId={market.id} arenaId={market.arenaId} />
          </div>
      )}
    </Card>
  )
}
