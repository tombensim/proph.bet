"use client"

import * as React from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet"
import { ActivityList } from "@/components/activity/activity-list"
import { getNotifications } from "@/app/actions/activity"
import { Notification } from "@prisma/client"

interface ActivitySidebarProps {
  currentArenaId?: string
}

export function ActivitySidebar({ currentArenaId }: ActivitySidebarProps) {
  const [open, setOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<(Notification & { arena?: { id: string, name: string } | null })[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setLoading(true)
      // Fetch all notifications by default, or scoped if desired. 
      // For now fetching all to match "Activity Center" behavior, 
      // but we could pass currentArenaId to filter initially if desired.
      getNotifications()
        .then(setNotifications)
        .finally(() => setLoading(false))
    }
  }, [open])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Activity</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Activity Center</SheetTitle>
          <SheetDescription>
            Your recent notifications and updates.
          </SheetDescription>
        </SheetHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ActivityList notifications={notifications} onLinkClick={() => setOpen(false)} />
        )}
      </SheetContent>
    </Sheet>
  )
}

