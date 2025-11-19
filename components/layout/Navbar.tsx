import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserNav } from "@/components/layout/UserNav"
import { Button } from "@/components/ui/button"
import { ArenaSwitcher } from "./ArenaSwitcher"
import { Menu } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/navigation';
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";

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
        },
        include: {
            arena: true
        }
        })
        if (membership) {
            points = membership.points
            isAdmin = membership.role === "ADMIN"
        }
    }

    // Fetch all memberships for switcher
    allMemberships = await prisma.arenaMembership.findMany({
        where: { userId: session.user.id },
        include: { arena: true }
    })
  }

  const baseUrl = arenaId ? `/arenas/${arenaId}` : ""

  return (
    <header className="border-b mb-8">
      <div className="flex h-16 items-center px-4 container mx-auto">
        <Link href="/" className="font-bold text-xl me-4 hidden md:block">
          proph.bet
        </Link>
        <Link href="/" className="font-bold text-xl me-2 md:hidden">
          pb
        </Link>

        {session?.user && (
            <ArenaSwitcher memberships={allMemberships} currentArenaId={arenaId} />
        )}
        
        {arenaId && (
          <>
            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 ms-4 rtl:space-x-reverse">
                <Link href={`${baseUrl}/markets`} className="text-sm font-medium transition-colors hover:text-primary">
                {t('markets')}
                </Link>
                <Link href={`${baseUrl}/leaderboard`} className="text-sm font-medium transition-colors hover:text-primary">
                {t('leaderboard')}
                </Link>
                {isAdmin && (
                    <Link href={`${baseUrl}/members`} className="text-sm font-medium transition-colors hover:text-primary">
                        {t('members')}
                    </Link>
                )}
            </nav>

             {/* Mobile Nav */}
             <div className="md:hidden ms-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem asChild>
                      <Link href={`${baseUrl}/markets`}>{t('markets')}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`${baseUrl}/leaderboard`}>{t('leaderboard')}</Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link href={`${baseUrl}/members`}>{t('members')}</Link>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
             </div>
          </>
        )}

        <div className="ms-auto flex items-center space-x-4 rtl:space-x-reverse">
            <LocaleSwitcher />
           {session?.user ? (
             <div className="flex items-center gap-2 md:gap-4">
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
