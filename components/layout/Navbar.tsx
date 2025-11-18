import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserNav } from "@/components/layout/UserNav"
import { Button } from "@/components/ui/button"

export async function Navbar() {
  const session = await auth()
  
  let points = 1000
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { points: true }
    })
    if (user) points = user.points
  }

  return (
    <header className="border-b">
      <div className="flex h-16 items-center px-4 container mx-auto">
        <Link href="/" className="font-bold text-xl mr-8">
          OfficePrediction
        </Link>
        <nav className="flex items-center space-x-4 lg:space-x-6">
          <Link href="/markets" className="text-sm font-medium transition-colors hover:text-primary">
            Markets
          </Link>
          <Link href="/markets/create" className="text-sm font-medium transition-colors hover:text-primary">
            Create Market
          </Link>
          <Link href="/leaderboard" className="text-sm font-medium transition-colors hover:text-primary">
            Leaderboard
          </Link>
           <Link href="/transfer" className="text-sm font-medium transition-colors hover:text-primary">
            Transfer
          </Link>
        </nav>
        <div className="ml-auto flex items-center space-x-4">
           {session?.user ? (
             <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground font-mono">
                  {points} pts
                </span>
                <UserNav user={session.user} />
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
