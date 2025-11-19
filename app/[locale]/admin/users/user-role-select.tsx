"use client"

import { Role } from "@prisma/client"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateUserRole } from "@/app/actions/admin"
import { useTransition } from "react"

export function UserRoleSelect({ userId, currentRole }: { userId: string, currentRole: Role }) {
  const [isPending, startTransition] = useTransition()
  
  return (
    <Select
      disabled={isPending}
      defaultValue={currentRole}
      onValueChange={(value) => {
        startTransition(async () => {
          try {
            await updateUserRole(userId, value as Role)
          } catch (error) {
            console.error("Failed to update role", error)
            // Revert is hard without state, but page will revalidate
          }
        })
      }}
    >
      <SelectTrigger className="w-[140px] h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="USER">User</SelectItem>
        <SelectItem value="GLOBAL_ADMIN">Global Admin</SelectItem>
        <SelectItem value="ADMIN">System Admin</SelectItem>
      </SelectContent>
    </Select>
  )
}

