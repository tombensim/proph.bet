"use client"

import { RefObject } from "react"
import { Badge } from "@/components/ui/badge"
import { ShareMarketButton } from "@/components/market/ShareMarketButton"
import { DownloadSummaryButton } from "@/components/market/DownloadSummaryButton"
import { EditMarketDialog } from "@/components/market/EditMarketDialog"

interface UserOption {
  id: string
  name: string | null
  email: string
}

interface MarketHeaderProps {
  marketType: string
  marketStatus: string
  isExpired: boolean
  hideBets: boolean
  marketTitle: string
  marketId: string
  summaryRef?: RefObject<HTMLDivElement | null>
  translations: {
    open: string
    closed: string
    betsHidden: string
  }
  // Added for edit dialog
  isCreatorOrAdmin?: boolean
  arenaId?: string
  hiddenUsers?: UserOption[]
  hideBetsFromUsers?: UserOption[]
}

export function MarketHeader({ 
  marketType, 
  marketStatus, 
  isExpired, 
  hideBets, 
  marketTitle,
  marketId,
  summaryRef,
  translations,
  isCreatorOrAdmin,
  arenaId,
  hiddenUsers,
  hideBetsFromUsers
}: MarketHeaderProps) {
  const isResolved = marketStatus === "RESOLVED"
  
  return (
    <div className="flex items-center gap-3 mb-2">
      <Badge>{marketType}</Badge>
      {marketStatus === "OPEN" ? (
        isExpired ? (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">Expired</Badge>
        ) : (
          <Badge variant="outline" className="text-green-600 border-green-600">{translations.open}</Badge>
        )
      ) : (
        <Badge variant="destructive">{translations.closed}</Badge>
      )}
      {hideBets && <Badge variant="secondary">{translations.betsHidden}</Badge>}
      
      <div className="flex items-center gap-2 ms-auto">
        {isCreatorOrAdmin && hiddenUsers && hideBetsFromUsers && (
            <EditMarketDialog 
               marketId={marketId}
               arenaId={arenaId}
               initialHiddenUsers={hiddenUsers} 
               initialHideBetsFromUsers={hideBetsFromUsers}
            />
        )}
        
        {isResolved && summaryRef && (
          <DownloadSummaryButton 
            summaryRef={summaryRef} 
            marketId={marketId}
          />
        )}
        <ShareMarketButton 
          marketTitle={marketTitle}
        />
      </div>
    </div>
  )
}
