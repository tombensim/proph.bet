"use client"

import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Shield, ShieldOff, Eye, EyeOff } from "lucide-react"
import { toggleMemberVisibilityAction, updateMemberRoleAction } from "@/app/actions/manage-members"
import { ArenaRole } from "@prisma/client"
import { useTransition } from "react"
import { toast } from "sonner"

interface MemberActionsProps {
  arenaId: string
  userId: string
  currentRole: ArenaRole
  isHidden: boolean
  isSelf: boolean
}

export function MemberActions({ arenaId, userId, currentRole, isHidden, isSelf }: MemberActionsProps) {
  const [isPending, startTransition] = useTransition()

  const handleToggleVisibility = () => {
    startTransition(async () => {
      try {
        await toggleMemberVisibilityAction(arenaId, userId)
        toast.success(isHidden ? "Member unhidden" : "Member hidden")
      } catch (error) {
        toast.error("Failed to update visibility")
      }
    })
  }

  const handleUpdateRole = (role: ArenaRole) => {
    startTransition(async () => {
      try {
        await updateMemberRoleAction(arenaId, userId, role)
        toast.success(`Role updated to ${role}`)
      } catch (error) {
        toast.error("Failed to update role")
      }
    })
  }

  if (isSelf) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={isPending}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleToggleVisibility}>
          {isHidden ? (
            <>
              <Eye className="mr-2 h-4 w-4" /> Unhide Member
            </>
          ) : (
            <>
              <EyeOff className="mr-2 h-4 w-4" /> Hide Member
            </>
          )}
        </DropdownMenuItem>
        
        {currentRole === "MEMBER" ? (
          <DropdownMenuItem onClick={() => handleUpdateRole("ADMIN")}>
            <Shield className="mr-2 h-4 w-4" /> Promote to Admin
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => handleUpdateRole("MEMBER")}>
            <ShieldOff className="mr-2 h-4 w-4" /> Demote to Member
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

