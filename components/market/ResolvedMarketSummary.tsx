"use client"

import { useMemo, forwardRef } from "react"
import { Market, Bet, Transaction, User, Option, AnalystSentiment, MarketType } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { AnalystSentimentDisplay } from "./AnalystSentimentDisplay"
import { Trophy, TrendingDown, TrendingUp, AlertCircle, Users, Coins, User as UserIcon } from "lucide-react"

// Extended types to include relations
type ExtendedMarket = Market & {
  bets: (Bet & { user: User })[]
  transactions: (Transaction & { toUser: User | null })[]
  options: Option[]
  analystSentiments: AnalystSentiment[]
  creator?: User
}

interface ResolvedMarketSummaryProps {
  market: ExtendedMarket
}

export const ResolvedMarketSummary = forwardRef<HTMLDivElement, ResolvedMarketSummaryProps>(
  ({ market }, ref) => {
  
  // 1. Calculate Leaderboard
  const leaderboard = useMemo(() => {
    const userStats = new Map<string, { 
      user: User, 
      invested: number, 
      payout: number, 
      profit: number 
    }>()

    // Track Investment
    market.bets.forEach(bet => {
      const stats = userStats.get(bet.userId) || { 
        user: bet.user, 
        invested: 0, 
        payout: 0, 
        profit: 0 
      }
      stats.invested += bet.amount
      stats.profit -= bet.amount // Initial deduction
      userStats.set(bet.userId, stats)
    })

    // Track Payouts
    market.transactions.forEach(tx => {
      if (tx.toUserId && tx.type === "WIN_PAYOUT") {
        // We might have users who got payouts but didn't bet (e.g. direct transfers? Unlikely for market payout)
        // But let's safely handle getting the user from the transaction if not in bets
        const existing = userStats.get(tx.toUserId)
        
        if (existing) {
          existing.payout += tx.amount
          existing.profit += tx.amount
        } else if (tx.toUser) {
           userStats.set(tx.toUserId, {
             user: tx.toUser,
             invested: 0,
             payout: tx.amount,
             profit: tx.amount
           })
        }
      }
    })

    const allStats = Array.from(userStats.values())
    
    // Sort by profit
    const winners = allStats
      .filter(s => s.profit > 0)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 3)

    const losers = allStats
      .filter(s => s.profit < 0)
      .sort((a, b) => a.profit - b.profit) // Most negative first
      .slice(0, 3)

    return { winners, losers }
  }, [market.bets, market.transactions])

  // 2. Determine Outcome Text
  const outcomeText = useMemo(() => {
     if (market.winningOptionId) {
       const option = market.options.find(o => o.id === market.winningOptionId)
       return option?.text || "Unknown Option"
     }
     if (market.winningValue !== null) {
       return market.winningValue.toString()
     }
     return "Resolved"
  }, [market])

  // 3. Calculate stats
  const totalPool = useMemo(() => {
    return market.bets.reduce((acc, bet) => acc + bet.amount, 0)
  }, [market.bets])

  const totalBets = market.bets.length
  const uniqueParticipants = new Set(market.bets.map(b => b.userId)).size

  return (
      <div ref={ref} className="space-y-8 bg-card text-card-foreground rounded-xl p-8 shadow-sm border">
        {/* Header: Market Title & Creator */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Badge variant="secondary" className="mb-3">
                Market Resolved
              </Badge>
              <h1 className="text-2xl md:text-3xl font-bold leading-tight">
                {market.title}
              </h1>
            </div>
          </div>
          
          {/* Creator Info */}
          {market.creator && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                <span className="font-medium">Created by</span>
              </div>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6 border">
                  <AvatarImage src={market.creator.image || undefined} />
                  <AvatarFallback className="text-xs">{market.creator.name?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <span className="font-semibold text-foreground">{market.creator.name}</span>
              </div>
            </div>
          )}
        </div>

        {/* Hero Section: Outcome */}
        <div className="relative bg-primary/5 rounded-xl p-8 text-center border border-primary/10 overflow-hidden">
           {/* Chami Judge - Decorative */}
           <div className="absolute -right-4 -bottom-8 w-32 h-32 md:w-40 md:h-40 opacity-20 rotate-12 pointer-events-none grayscale">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/chami-judge.png" alt="" className="w-full h-full object-contain" />
           </div>

           <div className="relative z-10 flex flex-col items-center">
             <div className="mb-4">
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img src="/chami-judge.png" alt="Judge Chami" className="w-24 h-24 object-contain drop-shadow-xl" />
             </div>
             
             <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Winning Outcome</h2>
             <div className="text-4xl md:text-6xl font-black tracking-tight mb-4 text-primary">
               {outcomeText}
             </div>

             {market.resolutionImage && (
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-background/50 px-4 py-2 rounded-full border shadow-sm">
                   <AlertCircle className="w-4 h-4" />
                   <span>Verified Resolution</span>
                </div>
             )}
           </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-muted/30 border-none shadow-none">
            <CardContent className="pt-6 text-center">
              <div className="flex justify-center mb-2">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="text-2xl font-bold">{uniqueParticipants}</div>
              <div className="text-xs text-muted-foreground mt-1">Participants</div>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/30 border-none shadow-none">
            <CardContent className="pt-6 text-center">
              <div className="flex justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div className="text-2xl font-bold">{totalBets}</div>
              <div className="text-xs text-muted-foreground mt-1">Total Bets</div>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/30 border-none shadow-none">
            <CardContent className="pt-6 text-center">
              <div className="flex justify-center mb-2">
                <Coins className="w-5 h-5 text-primary" />
              </div>
              <div className="text-2xl font-bold">{totalPool.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">Points Pool</div>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard Grid */}
        {(leaderboard.winners.length > 0 || leaderboard.losers.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Winners */}
            <Card className="bg-green-500/5 border-green-500/20">
              <CardHeader className="pb-4 border-b border-green-500/10">
                <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2 text-xl font-bold">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Trophy className="w-5 h-5" />
                  </div>
                  Top Winners
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                 {leaderboard.winners.length === 0 ? (
                   <p className="text-sm text-muted-foreground italic text-center py-4">No winners recorded.</p>
                 ) : (
                   <div className="space-y-3">
                     {leaderboard.winners.map((stat, i) => (
                       <div key={stat.user.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-green-500/10">
                          <div className="flex items-center gap-3">
                             <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                               <span className="font-mono text-sm font-bold">#{i + 1}</span>
                             </div>
                             <Avatar className="h-10 w-10 border">
                               <AvatarImage src={stat.user.image || undefined} />
                               <AvatarFallback>
                                 {stat.user.name?.[0] || "?"}
                               </AvatarFallback>
                             </Avatar>
                             <span className="font-semibold">{stat.user.name}</span>
                          </div>
                          <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-bold text-lg">
                             <TrendingUp className="w-4 h-4" />
                             <span>+{stat.profit.toLocaleString()}</span>
                          </div>
                       </div>
                     ))}
                   </div>
                 )}
              </CardContent>
            </Card>

            {/* Losers */}
            <Card className="bg-red-500/5 border-red-500/20">
              <CardHeader className="pb-4 border-b border-red-500/10">
                <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2 text-xl font-bold">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  Top Losers
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                 {leaderboard.losers.length === 0 ? (
                   <p className="text-sm text-muted-foreground italic text-center py-4">No losers recorded.</p>
                 ) : (
                   <div className="space-y-3">
                     {leaderboard.losers.map((stat, i) => (
                       <div key={stat.user.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-red-500/10">
                          <div className="flex items-center gap-3">
                             <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
                               <span className="font-mono text-sm font-bold">#{i + 1}</span>
                             </div>
                             <Avatar className="h-10 w-10 border">
                               <AvatarImage src={stat.user.image || undefined} />
                               <AvatarFallback>
                                 {stat.user.name?.[0] || "?"}
                               </AvatarFallback>
                             </Avatar>
                             <span className="font-semibold">{stat.user.name}</span>
                          </div>
                          <div className="text-red-600 dark:text-red-400 font-bold text-lg">
                             {stat.profit.toLocaleString()}
                          </div>
                       </div>
                     ))}
                   </div>
                 )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Embedded Analyst Summary (if exists) - hide in export */}
        {market.analystSentiments.length > 0 && (
           <div className="pt-4 no-export">
              <AnalystSentimentDisplay sentiments={market.analystSentiments} />
           </div>
        )}

        {/* Footer Branding - for exports */}
        <div className="pt-4 mt-6 border-t">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/chami-beige.png" alt="Proph.bet" className="w-8 h-8 object-contain" />
              <span className="font-bold text-foreground text-lg">Proph.bet</span>
            </div>
            <span className="mx-2">•</span>
            <span>Prediction Market Results</span>
          </div>
        </div>
      </div>
  )
})

ResolvedMarketSummary.displayName = "ResolvedMarketSummary"
