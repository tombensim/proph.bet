"use client"

import { AnalystSentiment } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TrendingUp, TrendingDown, Minus, ArrowRight, Lock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"

interface AnalystSentimentDisplayProps {
  sentiments: AnalystSentiment[]
}

export function AnalystSentimentDisplay({ sentiments }: AnalystSentimentDisplayProps) {
  if (!sentiments || sentiments.length === 0) return null

  // --- Data Processing ---

  // 1. Rating Distribution
  const distribution = {
    "STRONG_BUY": 0,
    "BUY": 0,
    "HOLD": 0,
    "SELL": 0,
    "STRONG_SELL": 0
  } as Record<string, number>

  let totalScore = 0
  
  sentiments.forEach(s => {
    if (distribution[s.rating] !== undefined) {
        distribution[s.rating]++
    }
    // Assign scores: 100, 75, 50, 25, 0
    switch(s.rating) {
        case "STRONG_BUY": totalScore += 100; break;
        case "BUY": totalScore += 75; break;
        case "HOLD": totalScore += 50; break;
        case "SELL": totalScore += 25; break;
        case "STRONG_SELL": totalScore += 0; break;
    }
  })

  const averageScore = Math.round(totalScore / sentiments.length)
  
  // 2. Sort by date for "Latest"
  const sortedSentiments = [...sentiments].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  const latest = sortedSentiments[0]
  
  // 3. Featured Analyst (e.g., random or specifically chosen)
  const topAnalyst = sortedSentiments[0] // Just use latest as top for now

  // --- Helpers ---

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "STRONG_BUY": return "bg-green-500 text-white"
      case "BUY": return "bg-green-400 text-white"
      case "STRONG_SELL": return "bg-red-600 text-white"
      case "SELL": return "bg-red-400 text-white"
      case "HOLD": return "bg-yellow-400 text-black"
      default: return "bg-gray-400 text-white"
    }
  }

  const getRatingLabel = (rating: string) => rating.replace('_', ' ')

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase()

  // --- Render ---

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-slate-900">Analyst Insights</h3>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        
        {/* 1. Top Analyst Card */}
        <Card className="bg-card border-slate-200 shadow-sm h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                    Latest Analyst
                    <Lock className="w-3 h-3" />
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${topAnalyst.analystId}`} />
                      <AvatarFallback>{getInitials(topAnalyst.analystId)}</AvatarFallback>
                    </Avatar>
                    <div className="font-bold text-lg leading-none">{topAnalyst.analystId}</div>
                </div>
                
                <div className="mt-auto space-y-2">
                    <div className="flex items-center justify-between text-sm font-medium text-slate-500">
                        <span>Impact Score</span>
                        <span>--/100</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-300 w-[0%]"></div>
                    </div>
                    <div className={`mt-3 inline-block px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${getRatingColor(topAnalyst.rating)}`}>
                        {getRatingLabel(topAnalyst.rating)}
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* 2. Sentiment Score / Price Targets */}
        <Card className="bg-card border-slate-200 shadow-sm h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Sentiment Score</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-[calc(100%-3rem)]">
                <div className="text-4xl font-black text-slate-900 mb-1">
                    {averageScore}<span className="text-lg text-slate-400 font-normal">/100</span>
                </div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-6">
                    Average Consensus
                </div>

                {/* Range Bar */}
                <div className="w-full relative h-12">
                    <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 rounded-full -translate-y-1/2"></div>
                    
                    {/* Indicator */}
                    <div 
                        className="absolute top-1/2 w-4 h-4 bg-white border-2 border-slate-900 rounded-full shadow-md -translate-y-1/2 -translate-x-1/2 transition-all duration-500"
                        style={{ left: `${averageScore}%` }}
                    ></div>

                    <div className="absolute bottom-0 left-0 text-[10px] font-medium text-slate-400">Bearish</div>
                    <div className="absolute bottom-0 right-0 text-[10px] font-medium text-slate-400">Bullish</div>
                </div>
            </CardContent>
        </Card>

        {/* 3. Recommendations Chart */}
        <Card className="bg-card border-slate-200 shadow-sm h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Analyst Consensus</CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-center gap-3 h-[140px] pb-2">
                {Object.entries(distribution).map(([rating, count]) => {
                    const height = count > 0 ? (count / sentiments.length) * 100 : 0
                    return (
                        <div key={rating} className="flex flex-col items-center gap-1 flex-1 group">
                            <div className="text-xs font-bold text-slate-700">{count > 0 ? count : ''}</div>
                            <div 
                                className={`w-full rounded-t-sm transition-all duration-500 min-h-[4px] ${getRatingColor(rating)} opacity-80 group-hover:opacity-100`}
                                style={{ height: `${Math.max(height, 4)}%` }}
                            ></div>
                            {/* Tooltip-ish label */}
                            <div className="hidden absolute -bottom-6 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 group-hover:block">
                                {getRatingLabel(rating)}
                            </div>
                        </div>
                    )
                })}
            </CardContent>
            {/* Legend */}
            <div className="px-4 pb-3 flex justify-between text-[9px] text-slate-400 uppercase font-medium tracking-wider border-t pt-2 mx-4">
                <span>Sell</span>
                <span>Hold</span>
                <span>Buy</span>
            </div>
        </Card>

        {/* 4. Latest Rating Details */}
        <Card className="bg-card border-slate-200 shadow-sm h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Latest Rating</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 text-sm">
                <div className="space-y-3">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Date</span>
                        <span className="font-medium">{new Date(latest.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Analyst</span>
                        <span className="font-medium truncate max-w-[100px]">{latest.analystId}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Rating</span>
                        <span className={`font-bold ${latest.rating.includes("BUY") ? "text-green-600" : latest.rating.includes("SELL") ? "text-red-600" : "text-yellow-600"}`}>
                            {getRatingLabel(latest.rating)}
                        </span>
                    </div>
                    <div className="mt-3 pt-1">
                        <p className="text-xs text-slate-500 italic line-clamp-3">
                            &quot;{latest.sentiment}&quot;
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>

      </div>
    </div>
  )
}
