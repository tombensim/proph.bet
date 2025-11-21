"use client"

import { RefObject } from "react"
import { Badge } from "@/components/ui/badge"
import { ShareMarketButton } from "@/components/market/ShareMarketButton"
import { DownloadSummaryButton } from "@/components/market/DownloadSummaryButton"

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
}

export function MarketHeader({ 
  marketType, 
  marketStatus, 
  isExpired, 
  hideBets, 
  marketTitle,
  marketId,
  summaryRef,
  translations 
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

