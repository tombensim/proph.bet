"use client"

import { Option } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Sparkles } from "lucide-react"

interface InlineBetOptionsProps {
  options: Option[]
  marketType: "BINARY" | "MULTIPLE_CHOICE" | "NUMERIC_RANGE"
  onSelectBet: (optionId: string, side: "yes" | "no") => void
  disabled?: boolean
  coverImage?: string | null
  isNew?: boolean
}

export function InlineBetOptions({ 
  options, 
  marketType, 
  onSelectBet, 
  disabled,
  coverImage,
  isNew
}: InlineBetOptionsProps) {
  // Calculate probabilities using AMM formula
  const inverseSum = options.reduce((sum, o) => sum + (1 / (o.liquidity || 100)), 0)
  const getProbability = (liquidity: number) => {
    if (inverseSum === 0) return 0
    return (1 / (liquidity || 100)) / inverseSum
  }

  // For binary markets, show a single row with Yes/No
  if (marketType === "BINARY" && options.length === 2) {
    const yesOption = options.find(o => o.text.toLowerCase() === "yes")
    const noOption = options.find(o => o.text.toLowerCase() === "no")
    
    if (yesOption && noOption) {
      const total = yesOption.liquidity + noOption.liquidity
      const yesPrice = noOption.liquidity / total
      const yesPercent = Math.round(yesPrice * 100)

      return (
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {coverImage && (
                <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImage} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <span className="text-2xl font-bold">{yesPercent}%</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className={cn(
                  "h-9 px-5 font-semibold min-w-[70px]",
                  "bg-emerald-500 hover:bg-emerald-600 text-white"
                )}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onSelectBet(yesOption.id, "yes")
                }}
                disabled={disabled}
              >
                {yesPercent}%
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-9 px-5 font-semibold min-w-[70px]"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onSelectBet(noOption.id, "no")
                }}
                disabled={disabled}
              >
                No
              </Button>
            </div>
          </div>
          
          {isNew && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-amber-500">
              <Sparkles className="h-4 w-4" />
              NEW
            </div>
          )}
        </div>
      )
    }
  }

  // Multiple choice / Multi-option markets - show each option with Yes/No buttons
  return (
    <div className="px-4 py-3 space-y-2">
      {options.map((option) => {
        const prob = getProbability(option.liquidity)
        const percent = Math.round(prob * 100)
        
        return (
          <div 
            key={option.id} 
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {coverImage && options.indexOf(option) === 0 && (
                <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImage} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <span className="text-sm font-medium truncate">{option.text}</span>
              <span className="text-lg font-bold">{percent}%</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className={cn(
                  "h-8 px-4 font-semibold min-w-[60px]",
                  "bg-emerald-500 hover:bg-emerald-600 text-white"
                )}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onSelectBet(option.id, "yes")
                }}
                disabled={disabled}
              >
                {percent}%
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-8 px-4 font-semibold min-w-[60px]"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onSelectBet(option.id, "no")
                }}
                disabled={disabled}
              >
                No
              </Button>
            </div>
          </div>
        )
      })}
      
      {isNew && (
        <div className="flex items-center gap-1.5 text-sm font-medium text-amber-500 pt-1">
          <Sparkles className="h-4 w-4" />
          NEW
        </div>
      )}
    </div>
  )
}

