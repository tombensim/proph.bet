"use client"

import { useRef, ReactNode } from "react"
import { MarketHeader } from "./market-header"
import { ResolvedMarketSummary } from "@/components/market/ResolvedMarketSummary"
import { Prisma } from "@prisma/client"

// Use a simplified type that matches what the component needs
type MarketWithRelations = Prisma.MarketGetPayload<{
  include: {
    bets: {
      include: { user: true, option: true }
    }
    transactions: {
      include: { toUser: true }
    }
    options: true
    analystSentiments: true
  }
}>

interface MarketContentProps {
  market: MarketWithRelations
  isExpired: boolean
  hideBets: boolean
  translations: {
    open: string
    closed: string
    betsHidden: string
  }
  disputeSection?: ReactNode
  heroSection: ReactNode
  mainContent: ReactNode
}

export function MarketContent({
  market,
  isExpired,
  hideBets,
  translations,
  disputeSection,
  heroSection,
  mainContent
}: MarketContentProps) {
  const summaryRef = useRef<HTMLDivElement>(null)
  const isResolved = market.status === "RESOLVED"

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Section */}
      <div>
        {heroSection}

        <MarketHeader
          marketType={market.type}
          marketStatus={market.status}
          isExpired={isExpired}
          hideBets={hideBets}
          marketTitle={market.title}
          marketId={market.id}
          summaryRef={isResolved ? summaryRef : undefined}
          translations={translations}
        />

        {disputeSection}
      </div>

      {/* Resolved Market Summary */}
      {isResolved && (
        <ResolvedMarketSummary ref={summaryRef} market={market} />
      )}

      {/* Main Content */}
      {mainContent}
    </div>
  )
}

