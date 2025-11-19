"use client"

import { formatDistanceToNow } from "date-fns"
import { Notification } from "@prisma/client"
import { 
  Trophy, 
  Coins, 
  Scale, 
  RefreshCw, 
  PlusCircle,
  Info 
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

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
  
  const content = (
    <div className={cn(
        "flex items-start space-x-4 p-4 rounded-lg border bg-card text-card-foreground shadow-sm transition-colors",
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
      </div>
    </div>
  )

  if (link) {
      return (
          <Link href={link} onClick={onLinkClick} className="block">
              {content}
          </Link>
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
