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
          <DropdownMenuItem>
            <Link href="/settings" className="cursor-pointer w-full h-full flex items-center">{t('profile')}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
             <Link href="/settings" className="cursor-pointer w-full h-full flex items-center">{t('settings')}</Link>
          </DropdownMenuItem>
          {user.role === "ADMIN" && (
             <DropdownMenuItem>
                <Link href="/admin" className="cursor-pointer w-full h-full flex items-center">{t('adminPanel')}</Link>
             </DropdownMenuItem>
          )}
          {arenaId && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Link href={`${baseUrl}/transfer`} className="cursor-pointer w-full h-full flex items-center">{t('transferPoints')}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href={`${baseUrl}/history`} className="cursor-pointer w-full h-full flex items-center">{t('betHistory')}</Link>
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
