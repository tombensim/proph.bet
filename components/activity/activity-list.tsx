"use client"

import { formatDistanceToNow } from "date-fns"
import { Notification } from "@prisma/client"
import { 
  Trophy, 
  Coins, 
  Scale, 
  RefreshCw, 
  PlusCircle,
  Info,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { DisputeDialog } from "@/app/[locale]/arenas/[arenaId]/markets/[id]/dispute-dialog"
import { Button } from "@/components/ui/button"

interface ActivityListProps {
  notifications: (Notification & {
    arena?: { id: string, name: string } | null
  })[]
  onLinkClick?: () => void
}

export function ActivityList({ notifications, onLinkClick }: ActivityListProps) {
  if (notifications.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        No recent activity found.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {notifications.map((notification) => (
          <ActivityItem key={notification.id} notification={notification} onLinkClick={onLinkClick} />
        ))}
      </div>
  )
}

function ActivityItem({ notification, onLinkClick }: { notification: Notification & { arena?: { id: string, name: string } | null }, onLinkClick?: () => void }) {
  const Icon = getIcon(notification.type)
  const metadata = notification.metadata as any
  const link = getLink(notification, metadata)
  
  const isResolvedNotification = notification.type === "MARKET_RESOLVED" || notification.type === "BET_RESOLVED"
  const marketId = metadata?.marketId
  const marketTitle = metadata?.marketTitle || "Market"

  const content = (
    <div className={cn(
        "flex items-start space-x-4 p-4 rounded-lg border bg-card text-card-foreground shadow-sm transition-colors relative",
        link && "hover:bg-muted/50 cursor-pointer"
    )}>
      <div className="mt-1 bg-muted p-2 rounded-full">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium leading-none">
            {getRefinedContent(notification, metadata)}
          </p>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
           {notification.arena && (
             <span className="mr-2 inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
               {notification.arena.name}
             </span>
           )}
           <span className="text-xs opacity-80">{notification.content}</span>
        </div>
        
        {/* Dispute Button inside notification */}
        {isResolvedNotification && marketId && (
          <div className="mt-2 flex justify-end" onClick={(e) => e.stopPropagation()}>
             <DisputeDialog 
               marketId={marketId} 
               marketTitle={marketTitle}
               trigger={
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Dispute
                  </Button>
               }
             />
          </div>
        )}
      </div>
    </div>
  )

  if (link) {
      return (
          <div className="relative">
             {/* We use a div wrapper and manual navigation for the main click if needed, 
                 but NextJS Link wraps everything. 
                 Problem: Button inside Link is invalid HTML.
                 Solution: Don't use Link wrapper if we have interactive elements inside, 
                 OR rely on z-index positioning which is messy.
                 Better: Render content without Link wrapper, handle click manually via div onClick?
                 Actually, simpler: Put the button OUTSIDE the link area or use object tag?
                 
                 Standard solution: Make the whole card clickable via absolute positioned link overlay,
                 and put the button with z-index higher on top.
             */}
             <Link href={link} onClick={onLinkClick} className="absolute inset-0 z-0" />
             <div className="relative z-10 pointer-events-none">
                 {/* Pass pointer events through wrapper */}
                 <div className={cn(
                    "flex items-start space-x-4 p-4 rounded-lg border bg-card text-card-foreground shadow-sm transition-colors pointer-events-auto",
                    "hover:bg-muted/50"
                )}>
                  <div className="mt-1 bg-muted p-2 rounded-full">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium leading-none">
                        {getRefinedContent(notification, metadata)}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                       {notification.arena && (
                         <span className="mr-2 inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                           {notification.arena.name}
                         </span>
                       )}
                       <span className="text-xs opacity-80">{notification.content}</span>
                    </div>
                    
                    {isResolvedNotification && marketId && (
                      <div className="mt-2 flex justify-end" onClick={(e) => e.stopPropagation()}>
                         <DisputeDialog 
                           marketId={marketId} 
                           marketTitle={marketTitle}
                           trigger={
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                Dispute
                              </Button>
                           }
                         />
                      </div>
                    )}
                  </div>
                </div>
             </div>
          </div>
      )
  }

  return content
}

function getIcon(type: string) {
  switch (type) {
    case "BET_RESOLVED": return Scale
    case "MARKET_RESOLVED": return Scale
    case "WIN_PAYOUT": return Coins
    case "MARKET_CREATED": return PlusCircle
    case "MONTHLY_WINNER": return Trophy
    case "POINTS_RESET": return RefreshCw
    case "MARKET_DISPUTED": return AlertTriangle
    default: return Info
  }
}

function getLink(notification: Notification, metadata: any) {
  if (metadata?.marketId && notification.arenaId) {
    return `/arenas/${notification.arenaId}/markets/${metadata.marketId}`
  }
  if (notification.type === "MONTHLY_WINNER" && notification.arenaId) {
      return `/arenas/${notification.arenaId}/leaderboard`
  }
  if (notification.type === "POINTS_RESET" && notification.arenaId) {
      return `/arenas/${notification.arenaId}/markets`
  }
  if (notification.arenaId) {
    return `/arenas/${notification.arenaId}/markets`
  }
  return null
}

function getRefinedContent(notification: Notification, metadata: any) {
  switch (notification.type) {
    case "BET_RESOLVED":
      return metadata?.outcome === "WON" ? "Bet Won" : "Bet Resolved"
    case "WIN_PAYOUT":
      return "Payout Received"
    case "MARKET_RESOLVED":
      return "Market Resolved"
    case "MARKET_CREATED":
      return "New Market Created"
    case "MONTHLY_WINNER":
      return "Monthly Winner Announced"
    case "POINTS_RESET":
      return "Points Reset"
    case "MARKET_DISPUTED":
      return "Market Disputed"
    default:
      return "Notification"
  }
}
