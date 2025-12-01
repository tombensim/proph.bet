"use client"

import * as React from "react"
import { Loader2, LogIn, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { joinArenaAsHiddenAdmin, leaveArenaAsHiddenAdmin } from "@/app/actions/admin"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"

interface ArenaJoinButtonProps {
  arenaId: string
  isMember: boolean
  isHidden?: boolean
}

export function ArenaJoinButton({ arenaId, isMember, isHidden }: ArenaJoinButtonProps) {
  const [loading, setLoading] = React.useState(false)
  const [currentIsMember, setCurrentIsMember] = React.useState(isMember)
  const t = useTranslations('Admin.arenas')

  const handleJoin = async () => {
    setLoading(true)
    try {
      await joinArenaAsHiddenAdmin(arenaId)
      setCurrentIsMember(true)
    } catch (error) {
      console.error("Failed to join arena:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLeave = async () => {
    setLoading(true)
    try {
      await leaveArenaAsHiddenAdmin(arenaId)
      setCurrentIsMember(false)
    } catch (error) {
      console.error("Failed to leave arena:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    )
  }

  if (currentIsMember) {
    return (
      <div className="flex items-center gap-2">
        {isHidden && (
          <Badge variant="outline" className="text-xs">
            {t('hidden')}
          </Badge>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleLeave}
          className="text-destructive hover:text-destructive"
        >
          <LogOut className="h-4 w-4 mr-1" />
          {t('leave')}
        </Button>
      </div>
    )
  }

  return (
    <Button variant="outline" size="sm" onClick={handleJoin}>
      <LogIn className="h-4 w-4 mr-1" />
      {t('join')}
    </Button>
  )
}

