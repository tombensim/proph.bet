"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { disputeMarketAction } from "@/app/actions/dispute-market"
import { AlertTriangle } from "lucide-react"

interface DisputeDialogProps {
  marketId: string
  marketTitle: string
  trigger?: React.ReactNode
}

export function DisputeDialog({ marketId, marketTitle, trigger }: DisputeDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    if (reason.length < 10) {
      toast.error("Please provide a detailed reason (at least 10 characters).")
      return
    }

    startTransition(async () => {
      try {
        await disputeMarketAction({ marketId, reason })
        toast.success("Dispute submitted successfully. Admins have been notified.")
        setOpen(false)
        setReason("")
      } catch (error: any) {
        toast.error(error.message || "Failed to submit dispute")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : (
          <Button variant="destructive" size="sm" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Dispute Decision
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dispute Market Resolution</DialogTitle>
          <DialogDescription>
            You are disputing the resolution of &quot;{marketTitle}&quot;. 
            Please explain why you believe the outcome is incorrect.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
            <Textarea 
                placeholder="Explain your dispute here..." 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground mt-2">
                This will notify the market creator and arena administrators.
            </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || reason.length < 10}>
            {isPending ? "Submitting..." : "Submit Dispute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
