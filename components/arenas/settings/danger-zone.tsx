"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Arena } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { archiveArenaAction, unarchiveArenaAction, deleteArenaAction } from "@/app/actions/arena-settings"

interface DangerZoneProps {
  arena: Arena
}

export function DangerZone({ arena }: DangerZoneProps) {
  const [isPending, startTransition] = useTransition()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const router = useRouter()

  const handleArchive = () => {
    startTransition(async () => {
      try {
        if (arena.archivedAt) {
          await unarchiveArenaAction(arena.id)
          toast.success("Arena unarchived")
        } else {
          await archiveArenaAction(arena.id)
          toast.success("Arena archived")
        }
      } catch (error) {
        toast.error("Failed to update arena status")
      }
    })
  }

  const handleDelete = () => {
    if (deleteConfirmation !== arena.name) return

    startTransition(async () => {
      try {
        await deleteArenaAction(arena.id)
        toast.success("Arena deleted")
        router.push("/") // Redirect to home
        router.refresh()
      } catch (error) {
        toast.error("Failed to delete arena")
      }
    })
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">Danger Zone</CardTitle>
        <CardDescription>
          Irreversible and destructive actions for this arena.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="space-y-1">
                <h3 className="font-medium">Archive Arena</h3>
                <p className="text-sm text-muted-foreground">
                    Archiving will hide the arena from lists but keep data intact.
                </p>
            </div>
            <Button 
                variant="outline" 
                onClick={handleArchive} 
                disabled={isPending}
            >
                {arena.archivedAt ? "Unarchive" : "Archive"}
            </Button>
        </div>

        <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg bg-destructive/10">
            <div className="space-y-1">
                <h3 className="font-medium text-destructive">Delete Arena</h3>
                <p className="text-sm text-muted-foreground">
                    Permanently remove this arena and all its data. This cannot be undone.
                </p>
            </div>
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="destructive" disabled={isPending}>Delete Arena</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete the 
                            <strong> {arena.name} </strong> arena and remove all associated data.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Type the arena name to confirm</Label>
                            <Input 
                                value={deleteConfirmation}
                                onChange={(e) => setDeleteConfirmation(e.target.value)}
                                placeholder={arena.name}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setIsDeleteDialogOpen(false)}
                            disabled={isPending}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleDelete}
                            disabled={isPending || deleteConfirmation !== arena.name}
                        >
                            {isPending ? "Deleting..." : "Delete Arena"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}

