"use client"

import * as React from "react"
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
import { MultiUserSelector } from "@/components/ui/multi-user-selector"
import { updateMarketVisibilityAction } from "@/app/actions/update-market"
import { toast } from "sonner"
import { Settings2 } from "lucide-react"
import { Label } from "@/components/ui/label"

interface UserOption {
  id: string
  name: string | null
  email: string
}

interface EditMarketDialogProps {
  marketId: string
  arenaId?: string | null
  initialHiddenUsers: UserOption[]
  initialHideBetsFromUsers: UserOption[]
}

export function EditMarketDialog({ 
  marketId, 
  arenaId, 
  initialHiddenUsers, 
  initialHideBetsFromUsers 
}: EditMarketDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [isPending, setIsPending] = React.useState(false)
  
  const [hiddenUsers, setHiddenUsers] = React.useState<string[]>(
    initialHiddenUsers.map(u => u.id)
  )
  const [hideBetsUsers, setHideBetsUsers] = React.useState<string[]>(
    initialHideBetsFromUsers.map(u => u.id)
  )

  const handleSave = async () => {
    setIsPending(true)
    try {
      await updateMarketVisibilityAction(marketId, hiddenUsers, hideBetsUsers)
      toast.success("Market settings updated successfully")
      setOpen(false)
    } catch (error) {
      toast.error("Failed to update market settings")
      console.error(error)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9">
          <Settings2 className="h-4 w-4" />
          <span>Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Market Settings</DialogTitle>
          <DialogDescription>
            Update who can see this market and its activity.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Hide Entire Market From</Label>
            <MultiUserSelector 
                value={hiddenUsers}
                onChange={setHiddenUsers}
                placeholder="Select users..."
                arenaId={arenaId || undefined}
                initialUsers={initialHiddenUsers}
            />
            <p className="text-xs text-muted-foreground">
                These users will see a locked market and cannot access details.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Hide Bets Activity From</Label>
            <MultiUserSelector 
                value={hideBetsUsers}
                onChange={setHideBetsUsers}
                placeholder="Select users..."
                arenaId={arenaId || undefined}
                initialUsers={initialHideBetsFromUsers}
            />
            <p className="text-xs text-muted-foreground">
                These users can bet, but cannot see who else bet or what they bet on.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
