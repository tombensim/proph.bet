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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
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
}).refine((data) => {
    // Custom validation to ensure optionId is present for non-numeric markets
    return true
})

export function BetForm({ market, userPoints }: BetFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const form = useForm<z.infer<typeof betSchema>>({
    // @ts-ignore
    resolver: zodResolver(betSchema),
    defaultValues: {
      amount: market.minBet || 10,
    }
  })

  // Calculate probabilities for display
  const inverseSum = market.options.reduce((sum, o) => sum + (1 / (o.liquidity || 100)), 0)
  const getProbability = (liquidity: number) => {
     if (inverseSum === 0) return 0
     return (1 / (liquidity || 100)) / inverseSum
  }

  const currentOptionId = form.watch("optionId")

  function onSubmit(data: z.infer<typeof betSchema>) {
    setError(null)
    setSuccess(false)

    // Client-side validation for market type specifics
    if (market.type !== "NUMERIC_RANGE" && !data.optionId) {
        form.setError("optionId", { type: "manual", message: "Please select an option" })
        return
    }
    if (market.type === "NUMERIC_RANGE" && data.numericValue === undefined) {
        form.setError("numericValue", { type: "manual", message: "Please enter a value" })
        return
    }

    startTransition(async () => {
      try {
        await placeBetAction({
          marketId: market.id,
          amount: data.amount,
          optionId: data.optionId,
          numericValue: data.numericValue
        })
        setSuccess(true)
        form.reset({
             amount: market.minBet || 10,
             optionId: undefined,
             numericValue: undefined
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to place bet")
      }
    })
  }

  const renderMarketInputs = () => {
    switch (market.type) {
      case "BINARY":
        return (
          <FormField
            // @ts-ignore
            control={form.control}
            name="optionId"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Choose Outcome</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex gap-4 w-full"
                  >
                    {market.options.map((option) => {
                      const prob = getProbability(option.liquidity)
                      const percent = Math.round(prob * 100)
                      const isSelected = currentOptionId === option.id
                      
                      return (
                        <FormItem key={option.id} className="flex-1 space-y-0">
                           <FormControl>
                             <Label
                               htmlFor={option.id} 
                               className={`
                                 flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all h-full
                                 ${isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-accent border-muted"}
                               `}
                             >
                               <div className="flex items-center gap-2">
                                 <RadioGroupItem value={option.id} id={option.id} />
                                 <span className="font-medium">{option.text}</span>
                               </div>
                               <span className="text-sm font-bold text-muted-foreground">{percent}%</span>
                             </Label>
                           </FormControl>
                        </FormItem>
                      )
                    })}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )
      case "MULTIPLE_CHOICE":
        return (
          <FormField
            // @ts-ignore
            control={form.control}
            name="optionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Option</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an outcome" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {market.options.map((option) => {
                      const prob = getProbability(option.liquidity)
                      const percent = Math.round(prob * 100)
                      return (
                        <SelectItem key={option.id} value={option.id}>
                          <div className="flex justify-between w-full gap-4 items-center min-w-[200px]">
                            <span>{option.text}</span>
                            <span className="text-muted-foreground font-mono text-xs">{percent}%</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )
      case "NUMERIC_RANGE":
        return (
          <FormField
            // @ts-ignore
            control={form.control}
            name="numericValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Prediction</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="any" 
                    placeholder="Enter value" 
                    {...field}
                    onChange={e => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )
      default:
        return null
    }
  }

  return (
    <Form {...form}>
      {/* @ts-ignore */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
        
        {renderMarketInputs()}

        <FormField
          // @ts-ignore
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
               <div className="flex items-center justify-between mb-2">
                 <FormLabel>Bet Amount (Points)</FormLabel>
                 <span className="text-sm text-muted-foreground">
                   Balance: {userPoints}
                 </span>
               </div>
              <FormControl>
                <Input 
                  type="number" 
                  {...field}
                  onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                />
              </FormControl>
              <div className="flex gap-2 text-xs text-muted-foreground">
                 {market.minBet && <span>Min: {market.minBet}</span>}
                 {market.maxBet && <span>Max: {market.maxBet}</span>}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

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
    </Form>
  )
}
