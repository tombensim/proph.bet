"use client"

import { useState, useTransition } from "react"
import { Market, Option, MarketType } from "@prisma/client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { placeBetAction } from "@/app/actions/place-bet"
import { Loader2 } from "lucide-react"

interface BetFormProps {
  market: Market & { options: Option[] }
  userPoints: number
}

const betSchema = z.object({
  amount: z.coerce.number().positive().int(),
  optionId: z.string().optional(),
  numericValue: z.coerce.number().optional(),
})

export function BetForm({ market, userPoints }: BetFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const form = useForm<z.infer<typeof betSchema>>({
    resolver: zodResolver(betSchema),
    defaultValues: {
      amount: market.minBet || 10,
    }
  })

  function onSubmit(data: z.infer<typeof betSchema>) {
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        await placeBetAction({
          marketId: market.id,
          amount: data.amount,
          optionId: data.optionId,
          numericValue: data.numericValue
        })
        setSuccess(true)
        form.reset()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to place bet")
      }
    })
  }

  const renderMarketInputs = () => {
    switch (market.type) {
      case "BINARY":
        // Binary markets should have 2 options: Yes and No
        // If not, fallback to Manual ID if present, but we expect options.
        return (
          <div className="space-y-3">
            <Label>Choose Outcome</Label>
            <RadioGroup 
               onValueChange={(val) => form.setValue("optionId", val)} 
               className="flex gap-4"
            >
              {market.options.map((option) => (
                <div key={option.id} className="flex items-center space-x-2 border p-4 rounded-lg cursor-pointer hover:bg-accent">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label htmlFor={option.id} className="cursor-pointer">{option.text}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )
      case "MULTIPLE_CHOICE":
        return (
          <div className="space-y-3">
             <Label>Select Option</Label>
             <Select onValueChange={(val) => form.setValue("optionId", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an outcome" />
                </SelectTrigger>
                <SelectContent>
                  {market.options.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.text}
                    </SelectItem>
                  ))}
                </SelectContent>
             </Select>
          </div>
        )
      case "NUMERIC_RANGE":
        return (
           <div className="space-y-3">
             <Label>Your Prediction</Label>
             <Input 
               type="number" 
               step="any" 
               placeholder="Enter value" 
               onChange={(e) => form.setValue("numericValue", parseFloat(e.target.value))}
             />
           </div>
        )
      default:
        return null
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
      
      {renderMarketInputs()}

      <div className="space-y-3">
        <Label>Bet Amount (Points)</Label>
        <div className="flex items-center gap-4">
          <Input 
            type="number" 
            {...form.register("amount")} 
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Balance: {userPoints}
          </span>
        </div>
        {market.minBet && <p className="text-xs text-muted-foreground">Min: {market.minBet}</p>}
        {market.maxBet && <p className="text-xs text-muted-foreground">Max: {market.maxBet}</p>}
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
          Bet placed successfully!
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Place Bet
      </Button>
    </form>
  )
}

