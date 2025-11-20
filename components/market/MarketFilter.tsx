"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "@/lib/navigation"
import { useSearchParams } from "next/navigation"
import { useTranslations } from 'next-intl'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { ListFilter } from "lucide-react"

export function MarketFilter({ isAdmin }: { isAdmin?: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('Markets')
  const tCommon = useTranslations('Common')

  // Parse current state
  const getStatuses = () => {
    const s = searchParams.get("status")
    const f = searchParams.get("filter")
    
    if (s !== null) return s === "" ? [] : s.split(',')
    
    // Legacy fallback
    if (f === 'resolved') return ['resolved']
    if (f === 'pending') return ['pending']
    
    return ['active', 'expired']
  }

  const currentStatuses = getStatuses()
  const showMyPositions = searchParams.get("show") === "my-positions" || searchParams.get("filter") === "my-positions"

  const updateFilters = (updates: { status?: string[], show?: boolean }) => {
    const params = new URLSearchParams(searchParams.toString())
    
    // Cleanup legacy
    params.delete("filter")

    // Handle Status
    let nextStatuses = updates.status !== undefined ? updates.status : currentStatuses
    
    if (nextStatuses.length === 0) {
        params.set("status", "")
    } else {
        params.set("status", nextStatuses.join(','))
    }

    // If we are back to default state (Active + Expired, no My Positions), we can remove params for cleaner URL
    if (nextStatuses.length === 2 && nextStatuses.includes('active') && nextStatuses.includes('expired') && !updates.show && !showMyPositions) {
        params.delete("status")
        params.delete("show")
    } else {
        // Handle Show
        const nextShow = updates.show !== undefined ? updates.show : showMyPositions
        if (nextShow) {
            params.set("show", "my-positions")
        } else {
            params.delete("show")
        }
    }
    
    router.push(`?${params.toString()}`)
  }

  const toggleStatus = (status: string) => {
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status]
    
    updateFilters({ status: newStatuses })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ListFilter className="h-4 w-4" />
          {tCommon('filter')}
          {(currentStatuses.length !== 1 || currentStatuses[0] !== 'open' || showMyPositions) && (
             <span className="flex h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{tCommon('status')}</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={currentStatuses.includes("active") || currentStatuses.includes("open")}
          onCheckedChange={() => toggleStatus("active")}
        >
          Active
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={currentStatuses.includes("expired")}
          onCheckedChange={() => toggleStatus("expired")}
        >
          Expired
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={currentStatuses.includes("resolved")}
          onCheckedChange={() => toggleStatus("resolved")}
        >
          {tCommon('resolved')}
        </DropdownMenuCheckboxItem>
        {isAdmin && (
           <DropdownMenuCheckboxItem
             checked={currentStatuses.includes("pending")}
             onCheckedChange={() => toggleStatus("pending")}
             className="text-yellow-600 focus:text-yellow-700"
           >
             {t('pendingApproval')}
           </DropdownMenuCheckboxItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{tCommon('view')}</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={showMyPositions}
          onCheckedChange={(checked) => updateFilters({ show: !!checked })}
        >
          {t('myPositions')}
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
