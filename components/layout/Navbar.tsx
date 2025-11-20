import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserNav } from "@/components/layout/UserNav"
import { Button } from "@/components/ui/button"
import { ArenaSwitcher } from "./ArenaSwitcher"
import { ActivitySidebar } from "@/components/activity/activity-sidebar"
import { Menu, Home } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/navigation';
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { Role } from "@prisma/client"
import Image from "next/image"

interface NavbarProps {
  arenaId?: string
}

export async function Navbar({ arenaId }: NavbarProps) {
  const session = await auth()
  const t = await getTranslations('Navbar');
  
  let points = 0
  let allMemberships: any[] = []
  let isAdmin = false
  
  if (session?.user?.id) {
    // Fetch current points if in arena
    if (arenaId) {
        const membership = await prisma.arenaMembership.findUnique({
        where: {
            userId_arenaId: {
            userId: session.user.id,
            arenaId: arenaId
            }
        }
        })
        if (membership) {
            points = membership.points
            isAdmin = membership.role === "ADMIN" || session.user.role === Role.ADMIN || session.user.role === Role.GLOBAL_ADMIN
        } else if (session.user.role === Role.ADMIN || session.user.role === Role.GLOBAL_ADMIN) {
             // Admins might not be members but should see admin options
             isAdmin = true
        }
    }

    // Fetch all memberships for switcher
    allMemberships = await prisma.arenaMembership.findMany({
        where: { userId: session.user.id },
        include: { 
          arena: {
            select: {
              id: true,
              name: true,
              slug: true,
              archivedAt: true,
              coverImage: true,
              description: true
            }
          }
        }
    })
  }

  const canCreateArena = session?.user?.role === Role.ADMIN || session?.user?.role === Role.GLOBAL_ADMIN
  const baseUrl = arenaId ? `/arenas/${arenaId}` : ""

  return (
    <header className="border-b mb-8">
      <div className="flex h-16 items-center px-4 container mx-auto">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl me-4 hidden md:flex hover:opacity-80 transition-opacity">
          <Image src="/chami-beige.png" alt="Logo" width={32} height={32} className="object-contain" />
          <span>proph.bet</span>
        </Link>
        <Link href="/" className="flex items-center font-bold text-xl me-2 md:hidden hover:opacity-80 transition-opacity">
          <Image src="/chami-beige.png" alt="Logo" width={32} height={32} className="object-contain" />
        </Link>

        {session?.user && (
            <ArenaSwitcher memberships={allMemberships} currentArenaId={arenaId} canCreate={canCreateArena} />
        )}
        
        {arenaId && (
          <>
            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-4 lg:gap-6 ms-4">
                <Link href={`${baseUrl}/markets`} className="text-sm font-medium transition-colors hover:text-primary">
                {t('markets')}
                </Link>
                <Link href={`${baseUrl}/leaderboard`} className="text-sm font-medium transition-colors hover:text-primary">
                {t('leaderboard')}
                </Link>
                {isAdmin && (
                    <>
                        <Link href={`${baseUrl}/members`} className="text-sm font-medium transition-colors hover:text-primary">
                            {t('members')}
                        </Link>
                        <Link href={`${baseUrl}/settings`} className="text-sm font-medium transition-colors hover:text-primary">
                            {t('settings')}
                        </Link>
                    </>
                )}
            </nav>

             {/* Mobile Nav */}
             <div className="md:hidden ms-2 flex items-center gap-1">
                {arenaId && (
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`${baseUrl}/markets`}>
                      <Home className="h-5 w-5" />
                      <span className="sr-only">{t('markets')}</span>
                    </Link>
                  </Button>
                )}
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem>
                      <Link href="/about" className="w-full h-full flex items-center">{t('about')}</Link>
                    </DropdownMenuItem>
                    {arenaId && (
                        <>
                            <DropdownMenuItem>
                              <Link href={`${baseUrl}/markets`} className="w-full h-full flex items-center">{t('markets')}</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Link href={`${baseUrl}/leaderboard`} className="w-full h-full flex items-center">{t('leaderboard')}</Link>
                            </DropdownMenuItem>
                            {isAdmin && (
                            <>
                                <DropdownMenuItem>
                                  <Link href={`${baseUrl}/members`} className="w-full h-full flex items-center">{t('members')}</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Link href={`${baseUrl}/settings`} className="w-full h-full flex items-center">{t('settings')}</Link>
                                </DropdownMenuItem>
                            </>
                            )}
                        </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
             </div>
          </>
        )}

        <div className="ms-auto flex items-center gap-4">
            {/* About Link - Desktop (Moved to right side) */}
            <div className="hidden md:flex items-center">
                <Link href="/about" className="text-sm font-medium transition-colors hover:text-primary text-muted-foreground">
                    {t('about')}
                </Link>
            </div>

            <LocaleSwitcher />
           {session?.user ? (
             <div className="flex items-center gap-2 md:gap-4">
                <ActivitySidebar currentArenaId={arenaId} />
                {arenaId && (
                  <span className="text-sm text-muted-foreground font-mono whitespace-nowrap">
                    {points} <span className="hidden md:inline">{t('points')}</span>
                  </span>
                )}
                <UserNav user={session.user} arenaId={arenaId} />
             </div>
           ) : (
             <Link href="/api/auth/signin">
                <Button>{t('signIn')}</Button>
             </Link>
           )}
        </div>
      </div>
    </header>
  )
}
