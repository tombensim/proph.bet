import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserNav } from "@/components/layout/UserNav"
import { Button } from "@/components/ui/button"
import { ArenaSwitcher } from "./ArenaSwitcher"

interface NavbarProps {
  arenaId?: string
}

export async function Navbar({ arenaId }: NavbarProps) {
  const session = await auth()
  
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
        <Link href="/" className="font-bold text-xl mr-4">
          proph.bet
        </Link>

        {session?.user && (
            <ArenaSwitcher memberships={allMemberships} currentArenaId={arenaId} />
        )}
        
        {arenaId && (
          <nav className="flex items-center space-x-4 lg:space-x-6 ml-4">
            <Link href={`${baseUrl}/markets`} className="text-sm font-medium transition-colors hover:text-primary">
              Markets
            </Link>
            <Link href={`${baseUrl}/leaderboard`} className="text-sm font-medium transition-colors hover:text-primary">
              Leaderboard
            </Link>
            {isAdmin && (
                <Link href={`${baseUrl}/members`} className="text-sm font-medium transition-colors hover:text-primary">
                    Members
                </Link>
            )}
          </nav>
        )}

        <div className="ml-auto flex items-center space-x-4">
           {session?.user ? (
             <div className="flex items-center gap-4">
                {arenaId && (
                  <span className="text-sm text-muted-foreground font-mono">
                    {points} pts
                  </span>
                )}
                <UserNav user={session.user} arenaId={arenaId} />
             </div>
           ) : (
             <Link href="/api/auth/signin">
                <Button>Sign In</Button>
             </Link>
           )}
        </div>
      </div>
    </header>
  )
}
