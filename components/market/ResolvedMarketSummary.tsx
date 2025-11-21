"use client"

import { useMemo, useRef, useState } from "react"
import { Market, Bet, Transaction, User, Option, AnalystSentiment, MarketType } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { AnalystSentimentDisplay } from "./AnalystSentimentDisplay"
import { Trophy, TrendingDown, TrendingUp, AlertCircle, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import * as htmlToImage from 'html-to-image'
import { toast } from "sonner"

// Extended types to include relations
type ExtendedMarket = Market & {
  bets: (Bet & { user: User })[]
  transactions: (Transaction & { toUser: User | null })[]
  options: Option[]
  analystSentiments: AnalystSentiment[]
}

interface ResolvedMarketSummaryProps {
  market: ExtendedMarket
}

export function ResolvedMarketSummary({ market }: ResolvedMarketSummaryProps) {
  const summaryRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleDownload = async () => {
    if (!summaryRef.current) return
    
    setIsExporting(true)
    try {
      // Create a blob from the element
      const blob = await htmlToImage.toBlob(summaryRef.current, {
        quality: 0.95,
        backgroundColor: '#ffffff', // Force white background for clean export
        style: {
           padding: '20px', // Add some padding to the export
        }
      })

      if (blob) {
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.download = `market-resolution-${market.id.slice(-6)}.png`
          link.href = url
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
          toast.success("Image downloaded successfully")
      }
    } catch (error) {
      console.error("Failed to export image:", error)
      toast.error("Failed to generate image")
    } finally {
      setIsExporting(false)
    }
  }
  
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

  return (
    <div className="space-y-6">
       <div className="flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownload} 
            disabled={isExporting}
            className="gap-2"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isExporting ? "Generating..." : "Download Summary"}
          </Button>
       </div>

      <div ref={summaryRef} className="space-y-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-xl">
        {/* Hero Section: Outcome */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-8 text-white shadow-xl border border-slate-700 text-center relative overflow-hidden">
           {/* Decorative Background Element */}
           <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute top-10 left-10 w-32 h-32 bg-blue-500 rounded-full blur-3xl"></div>
              <div className="absolute bottom-10 right-10 w-32 h-32 bg-purple-500 rounded-full blur-3xl"></div>
           </div>

           <div className="relative z-10">
             <Badge variant="outline" className="mb-4 border-slate-500 text-slate-300 bg-slate-900/50">
                Market Resolved
             </Badge>
             
             <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">Winning Outcome</h2>
             <div className="text-3xl md:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300 mb-6">
               {outcomeText}
             </div>

             {market.resolutionImage && (
                <div className="mt-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer bg-white/5 px-4 py-2 rounded-full border border-white/10">
                   <AlertCircle className="w-4 h-4" />
                   <span>Verified Resolution</span>
                </div>
             )}
           </div>
        </div>

        {/* Leaderboard Grid */}
        {(leaderboard.winners.length > 0 || leaderboard.losers.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Winners */}
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/10 dark:border-green-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2 text-lg">
                  <Trophy className="w-5 h-5" />
                  Greatest Winners
                </CardTitle>
              </CardHeader>
              <CardContent>
                 {leaderboard.winners.length === 0 ? (
                   <p className="text-sm text-muted-foreground italic">No winners recorded.</p>
                 ) : (
                   <div className="space-y-4">
                     {leaderboard.winners.map((stat, i) => (
                       <div key={stat.user.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <div className="font-mono text-lg font-bold text-green-600/50 w-4">#{i + 1}</div>
                             <Avatar className="h-8 w-8 border border-green-200">
                               <AvatarImage src={stat.user.image || undefined} />
                               <AvatarFallback>{stat.user.name?.[0] || "?"}</AvatarFallback>
                             </Avatar>
                             <span className="font-medium text-sm">{stat.user.name}</span>
                          </div>
                          <div className="flex items-center gap-1 text-green-600 font-bold">
                             <TrendingUp className="w-3 h-3" />
                             +{stat.profit.toLocaleString()}
                          </div>
                       </div>
                     ))}
                   </div>
                 )}
              </CardContent>
            </Card>

            {/* Losers */}
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/10 dark:border-red-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2 text-lg">
                  <TrendingDown className="w-5 h-5" />
                  Biggest Losers
                </CardTitle>
              </CardHeader>
              <CardContent>
                 {leaderboard.losers.length === 0 ? (
                   <p className="text-sm text-muted-foreground italic">No losers recorded.</p>
                 ) : (
                   <div className="space-y-4">
                     {leaderboard.losers.map((stat, i) => (
                       <div key={stat.user.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <div className="font-mono text-lg font-bold text-red-600/50 w-4">#{i + 1}</div>
                             <Avatar className="h-8 w-8 border border-red-200">
                               <AvatarImage src={stat.user.image || undefined} />
                               <AvatarFallback>{stat.user.name?.[0] || "?"}</AvatarFallback>
                             </Avatar>
                             <span className="font-medium text-sm">{stat.user.name}</span>
                          </div>
                          <div className="text-red-600 font-bold">
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

        {/* Embedded Analyst Summary (if exists) */}
        {market.analystSentiments.length > 0 && (
           <div className="pt-4">
              <AnalystSentimentDisplay sentiments={market.analystSentiments} />
           </div>
        )}
      </div>
    </div>
  )
}
