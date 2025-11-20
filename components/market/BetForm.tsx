"use client"

import { useState, useTransition, useMemo } from "react"
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
import { Loader2, Info } from "lucide-react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface BetFormProps {
  market: Market & { options: Option[] }
  userPoints: number
  totalPool?: number
  feePercent?: number
  translations?: any
}

const betSchema = z.object({
  amount: z.coerce.number().positive().int(),
  optionId: z.string().optional(),
  numericValue: z.coerce.number().optional(),
}).refine((data) => {
    // Custom validation to ensure optionId is present for non-numeric markets
    return true
})

type PotentialReturn = 
  | { type: "NUMERIC"; totalPool: number }
  | { type: "AMM"; payout: number; profit: number; percent: number; fee: number }
  | null;

export function BetForm({ market, userPoints, totalPool = 0, feePercent = 0, translations }: BetFormProps) {
  const tHook = useTranslations('MarketDetail.betForm');
  
  // Fallback to provided translations or use hook
  const t = (key: string, params?: Record<string, string | number>) => {
      if (translations && translations[key]) {
          let text = translations[key];
          if (params) {
              Object.entries(params).forEach(([k, v]) => {
                  text = text.replace(`{${k}}`, String(v));
              });
          }
          return text;
      }
      // @ts-ignore
      return tHook(key, params);
  }

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
  const betAmount = form.watch("amount")

  const potentialReturn = useMemo<PotentialReturn>(() => {
    if (!betAmount || betAmount <= 0) return null

    if (market.type === "NUMERIC_RANGE" && (!market.options || market.options.length === 0)) {
       return { type: "NUMERIC", totalPool: (totalPool || 0) + betAmount }
    }

    if (currentOptionId && market.options) {
       const option = market.options.find(o => o.id === currentOptionId)
       if (option) {
          const inverseSum = market.options.reduce((sum, o) => sum + (1 / (o.liquidity || 100)), 0)
          const prob = inverseSum === 0 ? 0 : (1 / (option.liquidity || 100)) / inverseSum
          
          if (prob > 0) {
            const fee = Math.floor(betAmount * feePercent)
            const netInvestment = betAmount - fee
            const payout = Math.floor(netInvestment / prob)
            const profit = payout - betAmount
            const percent = Math.round((profit / betAmount) * 100)
            return { type: "AMM", payout, profit, percent, fee }
          }
       }
    }
    return null
  }, [betAmount, currentOptionId, market.type, market.options, totalPool, feePercent])

  const numericData = useMemo(() => {
    if (market.type !== "NUMERIC_RANGE" || !market.options) return [];
    
    // Sort options by min value
    const sorted = [...market.options].sort((a, b) => {
        const minA = parseFloat(a.text.split(" - ")[0])
        const minB = parseFloat(b.text.split(" - ")[0])
        return minA - minB
    })

    return sorted.map(opt => {
        const prob = getProbability(opt.liquidity)
        return {
            id: opt.id,
            range: opt.text,
            probability: prob,
            percent: Math.round(prob * 100)
        }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market.options, market.type])

  function onSubmit(data: z.infer<typeof betSchema>) {
    setError(null)
    setSuccess(false)

    const isNumericAMM = market.type === "NUMERIC_RANGE" && market.options && market.options.length > 0;

    // Client-side validation for market type specifics
    if (!isNumericAMM && market.type !== "NUMERIC_RANGE" && !data.optionId) {
        form.setError("optionId", { type: "manual", message: "Please select an option" })
        return
    }
    if (isNumericAMM && !data.optionId) {
        form.setError("optionId", { type: "manual", message: "Please select a range" })
        return
    }
    if (!isNumericAMM && market.type === "NUMERIC_RANGE" && data.numericValue === undefined) {
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
        setError(err instanceof Error ? err.message : t('error'))
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
                <FormLabel>{t('chooseOutcome')}</FormLabel>
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
                <FormLabel>{t('selectOption')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectOutcome')} />
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
        if (market.options && market.options.length > 0) {
             return (
                 <FormField
                   // @ts-ignore
                   control={form.control}
                   name="optionId"
                   render={({ field }) => (
                     <FormItem className="space-y-4">
                       <FormLabel>{t('chooseOutcome')}</FormLabel>
                       
                       {/* Histogram */}
                       <div className="h-[200px] w-full border rounded-lg p-2 bg-muted/10">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={numericData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                               <XAxis 
                                    dataKey="range" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    interval={0} 
                                    angle={-45}
                                    textAnchor="end"
                                    height={50}
                               />
                               <YAxis hide />
                               <Tooltip 
                                  formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, "Probability"]}
                                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                               />
                               <Bar dataKey="probability" onClick={(data) => field.onChange(data.id)} cursor="pointer" radius={[4, 4, 0, 0]}>
                                  {numericData.map((entry, index) => (
                                     <Cell 
                                       key={`cell-${index}`} 
                                       fill={field.value === entry.id ? "hsl(var(--primary))" : "hsl(var(--primary))"} 
                                       opacity={field.value === entry.id ? 1 : 0.5}
                                     />
                                  ))}
                               </Bar>
                            </BarChart>
                         </ResponsiveContainer>
                       </div>

                       <FormControl>
                         <Select onValueChange={field.onChange} value={field.value}>
                           <SelectTrigger>
                             <SelectValue placeholder={t('selectOutcome')} />
                           </SelectTrigger>
                           <SelectContent>
                             {numericData.map((item) => (
                               <SelectItem key={item.id} value={item.id}>
                                 {item.range} ({item.percent}%)
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
             )
        }
        return (
          <FormField
            // @ts-ignore
            control={form.control}
            name="numericValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('yourPrediction')}</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="any" 
                    placeholder={t('enterValue')}
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
                <FormLabel>{t('betAmount')}</FormLabel>
                <span className="text-sm text-muted-foreground">
                  {t('balance', { amount: userPoints })}
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
                 {market.minBet && <span>{t('min', { amount: market.minBet })}</span>}
                 {market.maxBet && <span>{t('max', { amount: market.maxBet })}</span>}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {potentialReturn && (
           <div className="bg-muted/50 rounded-lg p-4 text-sm border border-dashed">
              {potentialReturn.type === "AMM" ? (
                 <div className="grid grid-cols-2 gap-y-2">
                    <div className="text-muted-foreground">{t('potentialPayout').split(":")[0]}:</div>
                    <div className="text-right font-semibold">~{potentialReturn.payout} pts</div>
                    
                    <div className="text-muted-foreground">{t('potentialProfit').split(":")[0]}:</div>
                    <div className="text-right font-semibold text-green-600">
                        +{potentialReturn.profit} pts ({potentialReturn.percent > 0 ? "+" : ""}{potentialReturn.percent}%)
                    </div>
                    
                    <div className="text-muted-foreground">{t('maxLoss').split(":")[0]}:</div>
                    <div className="text-right font-semibold text-destructive">
                        -{betAmount} pts
                    </div>

                    {potentialReturn.fee > 0 && (
                        <>
                            <div className="text-muted-foreground text-xs mt-1 pt-1 border-t">Network Fee:</div>
                            <div className="text-right text-xs text-muted-foreground mt-1 pt-1 border-t">
                                {potentialReturn.fee} pts
                            </div>
                        </>
                    )}
                 </div>
              ) : (
                 <div className="space-y-1">
                    <div className="font-medium">{t('totalPool')} (Estimated): {potentialReturn.totalPool} pts</div>
                    <div className="text-xs text-muted-foreground flex gap-1">
                       <Info className="h-3 w-3 mt-0.5" />
                       <span>{t('parimutuelInfo')}</span>
                    </div>
                 </div>
              )}
           </div>
        )}

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 text-sm text-green-700 bg-green-50 p-3 rounded-md border border-green-200">
             <div className="relative w-12 h-12 flex-shrink-0 animate-in zoom-in duration-300">
               <Image 
                 src="/cham-happy.png" 
                 alt="Success" 
                 fill 
                 className="object-contain"
               />
             </div>
            <div className="flex-1">
              <p className="font-semibold">{t('success')}</p>
              <p className="text-xs opacity-90">Good luck!</p>
            </div>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
             <div className="flex items-center">
               <div className="relative w-6 h-6 mr-2 animate-spin">
                 <Image 
                   src="/chami-spinning.png" 
                   alt="Loading" 
                   fill 
                   className="object-contain"
                 />
               </div>
               <span>Processing...</span>
             </div>
          ) : (
             t('placeBet')
          )}
        </Button>
      </form>
    </Form>
  )
}
