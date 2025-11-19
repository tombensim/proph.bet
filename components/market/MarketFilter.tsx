"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "@/lib/navigation"
import { useSearchParams } from "next/navigation"
import { useTranslations } from 'next-intl';

export function MarketFilter({ isAdmin }: { isAdmin?: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentFilter = searchParams.get("filter")
  const t = useTranslations('Markets');

  const setFilter = (filter: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (filter) {
      params.set("filter", filter)
    } else {
      params.delete("filter")
    }
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex gap-2">
      <Button 
        variant={currentFilter === "my-positions" ? "default" : "outline"}
        onClick={() => setFilter(currentFilter === "my-positions" ? null : "my-positions")}
        className="gap-2"
      >
        {t('myPositions')}
        {currentFilter === "my-positions" && (
          <span className="ms-1 h-2 w-2 rounded-full bg-primary-foreground animate-pulse" />
        )}
      </Button>
      
      {isAdmin && (
        <Button 
          variant={currentFilter === "pending" ? "default" : "outline"}
          onClick={() => setFilter(currentFilter === "pending" ? null : "pending")}
          className="gap-2 border-yellow-500/50 hover:bg-yellow-500/10 data-[state=active]:bg-yellow-500"
        >
          {t('pendingApproval')}
        </Button>
      )}
    </div>
  )
}
