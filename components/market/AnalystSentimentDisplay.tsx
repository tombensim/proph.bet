"use client"

import { AnalystSentiment } from "@prisma/client"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface AnalystSentimentDisplayProps {
  sentiments: AnalystSentiment[]
}

export function AnalystSentimentDisplay({ sentiments }: AnalystSentimentDisplayProps) {
  if (!sentiments || sentiments.length === 0) return null

  const getRatingConfig = (rating: string) => {
    switch (rating) {
      case "STRONG_BUY": return { color: "text-green-700", bg: "bg-green-50", border: "border-green-200", label: "Strong Buy", icon: <TrendingUp className="w-4 h-4" /> }
      case "BUY": return { color: "text-green-600", bg: "bg-green-50", border: "border-green-100", label: "Buy", icon: <TrendingUp className="w-4 h-4" /> }
      case "STRONG_SELL": return { color: "text-red-700", bg: "bg-red-50", border: "border-red-200", label: "Strong Sell", icon: <TrendingDown className="w-4 h-4" /> }
      case "SELL": return { color: "text-red-600", bg: "bg-red-50", border: "border-red-100", label: "Sell", icon: <TrendingDown className="w-4 h-4" /> }
      case "HOLD": return { color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-100", label: "Hold", icon: <Minus className="w-4 h-4" /> }
      default: return { color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-100", label: "Neutral", icon: <Minus className="w-4 h-4" /> }
    }
  }

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase()

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          Analyst Ratings
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
            {sentiments.length}
          </span>
        </h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sentiments.map((sentiment) => {
          const config = getRatingConfig(sentiment.rating)
          
          return (
            <Card key={sentiment.id} className="overflow-hidden transition-all hover:shadow-md hover:border-slate-300 group">
              <CardContent className="p-0">
                {/* Header with Analyst Info & Rating */}
                <div className="p-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${sentiment.analystId}`} />
                      <AvatarFallback className="bg-slate-100 text-slate-600 font-bold">
                        {getInitials(sentiment.analystId)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-bold text-slate-900 text-sm leading-tight">
                        {sentiment.analystId}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        {formatDistanceToNow(new Date(sentiment.updatedAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${config.bg} ${config.color} ${config.border}`}>
                    {config.icon}
                    {config.label}
                  </div>
                </div>

                {/* Sentiment Content */}
                <div className="px-4 pb-4">
                   <div className="relative pl-3 border-l-2 border-slate-200 group-hover:border-indigo-300 transition-colors">
                     <p className="text-sm text-slate-600 leading-relaxed italic">
                       &quot;{sentiment.sentiment}&quot;
                     </p>
                   </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
