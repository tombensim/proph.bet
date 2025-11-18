"use client"

import { useState, useTransition } from "react"
import { Market, Option } from "@prisma/client"
import { resolveMarketAction } from "@/app/actions/resolve-market"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface ResolveMarketFormProps {
  market: Market & { options: Option[] }
}

export function ResolveMarketForm({ market }: ResolveMarketFormProps) {
  const [isPending, startTransition] = useTransition()
  const [winningOptionId, setWinningOptionId] = useState<string>("")
  const [winningValue, setWinningValue] = useState<string>("")
  
  function onResolve() {
    if (!confirm("Are you sure? This cannot be undone.")) return

    startTransition(async () => {
      try {
        await resolveMarketAction({
          marketId: market.id,
          winningOptionId: winningOptionId || undefined,
          winningValue: winningValue ? parseFloat(winningValue) : undefined
        })
      } catch (error) {
        alert("Failed to resolve")
        console.error(error)
      }
    })
  }

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <CardTitle className="text-orange-700">Resolve Market</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Select the correct outcome to distribute points.</p>
        
        {(market.type === "BINARY" || market.type === "MULTIPLE_CHOICE") && (
           <div className="space-y-2">
             <Label>Winning Option</Label>
             <Select onValueChange={setWinningOptionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select winner" />
                </SelectTrigger>
                <SelectContent>
                  {market.options.map(opt => (
                    <SelectItem key={opt.id} value={opt.id}>{opt.text}</SelectItem>
                  ))}
                </SelectContent>
             </Select>
           </div>
        )}

        {market.type === "NUMERIC_RANGE" && (
           <div className="space-y-2">
             <Label>Winning Value</Label>
             <Input 
               type="number" 
               onChange={(e) => setWinningValue(e.target.value)} 
               placeholder="Enter exact value"
             />
           </div>
        )}

        <Button 
          onClick={onResolve} 
          disabled={isPending || (!winningOptionId && !winningValue)}
          variant="destructive"
          className="w-full"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Finalize & Payout
        </Button>
      </CardContent>
    </Card>
  )
}

