"use client"

import { useState, useTransition, useMemo } from "react"
import { Option } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { X, Loader2 } from "lucide-react"
import { placeBetAction } from "@/app/actions/place-bet"
import { v4 as uuidv4 } from 'uuid'
import { cn } from "@/lib/utils"
import Image from "next/image"

interface CompactBetFormProps {
  marketId: string
  option: Option
  side: "yes" | "no"
  allOptions: Option[]
  userPoints: number
  feePercent: number
  minBet?: number
  maxBet?: number
  coverImage?: string | null
  onClose: () => void
  onSuccess?: () => void
}

export function CompactBetForm({
  marketId,
  option,
  side,
  allOptions,
  userPoints,
  feePercent,
  minBet = 10,
  maxBet,
  coverImage,
  onClose,
  onSuccess
}: CompactBetFormProps) {
  const [amount, setAmount] = useState(minBet)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [idempotencyKey, setIdempotencyKey] = useState(uuidv4())

  const effectiveMax = maxBet ? Math.min(maxBet, userPoints) : userPoints

  // Calculate potential return
  const potentialReturn = useMemo(() => {
    if (!amount || amount <= 0) return null
    
    const inverseSum = allOptions.reduce((sum, o) => sum + (1 / (o.liquidity || 100)), 0)
    const prob = inverseSum === 0 ? 0 : (1 / (option.liquidity || 100)) / inverseSum
    
    if (prob > 0) {
      const fee = Math.floor(amount * feePercent)
      const netInvestment = amount - fee
      const payout = Math.floor(netInvestment / prob)
      return { payout, fee }
    }
    return null
  }, [amount, option.liquidity, allOptions, feePercent])

  const handleSubmit = () => {
    if (amount <= 0 || amount > userPoints) return
    
    setError(null)
    startTransition(async () => {
      try {
        await placeBetAction({
          marketId,
          amount,
          optionId: option.id,
          idempotencyKey
        })
        setSuccess(true)
        setIdempotencyKey(uuidv4())
        
        // Show success briefly then close
        setTimeout(() => {
          onSuccess?.()
          onClose()
        }, 1500)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to place bet")
      }
    })
  }

  const handleAmountChange = (value: number) => {
    const clamped = Math.min(Math.max(minBet, value), effectiveMax)
    setAmount(clamped)
  }

  const isYes = side === "yes"
  const buttonColor = isYes 
    ? "bg-emerald-500 hover:bg-emerald-600" 
    : "bg-red-500 hover:bg-red-600"

  if (success) {
    return (
      <div className="p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="relative w-12 h-12 flex-shrink-0 animate-in zoom-in duration-300">
            <Image 
              src="/cham-happy.png" 
              alt="Success" 
              fill 
              className="object-contain"
            />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-green-700">Bet placed!</p>
            <p className="text-xs text-green-600 opacity-90">Good luck!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3 bg-card" onClick={(e) => e.stopPropagation()}>
      {/* Header with option and close button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {coverImage && (
            <div className="w-8 h-8 rounded-md overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverImage} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <span className="font-medium truncate">{option.text}</span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onClose()
          }}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Amount Input with quick add buttons */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <Input
            type="number"
            value={amount}
            onChange={(e) => handleAmountChange(parseInt(e.target.value) || 0)}
            className="pl-7 h-10 bg-muted/50"
            min={minBet}
            max={effectiveMax}
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="h-10 px-3 text-xs font-medium"
          onClick={() => handleAmountChange(amount + 1)}
          disabled={amount >= effectiveMax}
        >
          +1
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="h-10 px-3 text-xs font-medium"
          onClick={() => handleAmountChange(amount + 10)}
          disabled={amount >= effectiveMax}
        >
          +10
        </Button>
        <div className="flex-1">
          <Slider
            value={[amount]}
            onValueChange={([val]) => handleAmountChange(val)}
            min={minBet}
            max={effectiveMax}
            step={1}
            className="w-full"
          />
        </div>
      </div>

      {/* Balance indicator */}
      <div className="text-xs text-muted-foreground text-right">
        Balance: {userPoints} pts
      </div>

      {/* Error message */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">
          {error}
        </div>
      )}

      {/* Submit button */}
      <Button
        className={cn("w-full h-12 text-base font-semibold text-white", buttonColor)}
        onClick={handleSubmit}
        disabled={isPending || amount <= 0 || amount > userPoints}
      >
        {isPending ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Placing bet...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <span>Buy {isYes ? "Yes" : "No"}</span>
            {potentialReturn && (
              <span className="text-xs opacity-90">
                To win ${potentialReturn.payout}
              </span>
            )}
          </div>
        )}
      </Button>
    </div>
  )
}

