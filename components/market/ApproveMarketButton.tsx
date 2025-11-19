"use client"

import { approveMarketAction } from "@/app/actions/approve-market"
import { Button } from "@/components/ui/button"
import { useTransition } from "react"
import { toast } from "sonner"
import { Check } from "lucide-react"

export function ApproveMarketButton({ marketId, arenaId }: { marketId: string, arenaId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button 
        size="sm" 
        className="w-full gap-2 bg-green-600 hover:bg-green-700"
        disabled={isPending}
        onClick={(e) => {
            e.preventDefault()
            startTransition(async () => {
                try {
                    await approveMarketAction(marketId, arenaId)
                    toast.success("Market approved")
                } catch(e) {
                    toast.error("Failed to approve")
                }
            })
        }}
    >
        <Check className="w-4 h-4" />
        Approve Market
    </Button>
  )
}

