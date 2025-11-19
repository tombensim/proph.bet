"use client"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"
import { Link } from "@/lib/navigation"
import { useTranslations } from 'next-intl';

export function UserNav({ user, arenaId }: { user: any, arenaId?: string }) {
  const baseUrl = arenaId ? `/arenas/${arenaId}` : ""
  const t = useTranslations('UserNav');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image || ""} alt={user.name || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">{t('profile')}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
             <Link href="/settings" className="cursor-pointer">{t('settings')}</Link>
          </DropdownMenuItem>
          {user.role === "ADMIN" && (
             <DropdownMenuItem asChild>
                <Link href="/admin" className="cursor-pointer">{t('adminPanel')}</Link>
             </DropdownMenuItem>
          )}
          {arenaId && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`${baseUrl}/transfer`} className="cursor-pointer">{t('transferPoints')}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`${baseUrl}/history`} className="cursor-pointer">{t('betHistory')}</Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          {t('logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
