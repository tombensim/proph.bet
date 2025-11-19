import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Link } from "@/lib/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"
import Image from "next/image"

export default async function Home() {
  const session = await auth()
  
  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
        <div className="relative w-40 h-40 animate-in fade-in zoom-in duration-700">
          <Image 
            src="/cham-thinking.png" 
            alt="Proph.bet Mascot" 
            fill 
            className="object-contain drop-shadow-xl"
            priority
          />
        </div>
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
          proph.bet
        </h1>
        <p className="max-w-[600px] text-muted-foreground md:text-xl">
          Place bets, climb the leaderboard, and have fun with your colleagues.
        </p>
        <Link href="/api/auth/signin">
          <Button size="lg">Get Started</Button>
        </Link>
      </div>
    );
  }

  const memberships = await prisma.arenaMembership.findMany({
    where: { userId: session.user.id },
    include: { arena: true },
    orderBy: { joinedAt: 'desc' }
  })
  
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  const canCreateArena = user?.role === 'ADMIN' || user?.role === 'GLOBAL_ADMIN'

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your Arenas</h1>
      </div>

      {memberships.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20 flex flex-col items-center">
          <div className="relative w-32 h-32 mb-4 opacity-80">
            <Image 
              src="/chami-sad.png" 
              alt="No Arenas" 
              fill 
              className="object-contain"
            />
          </div>
          <p className="text-muted-foreground mb-4">You haven't joined any arenas yet.</p>
          {canCreateArena ? (
             <p>Create an arena to get started.</p>
          ) : (
             <p>Ask an administrator to invite you to an arena.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {memberships.map((membership) => (
            <Link key={membership.id} href={`/arenas/${membership.arenaId}/markets`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle>{membership.arena.name}</CardTitle>
                  <CardDescription>{membership.arena.description}</CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-between text-sm text-muted-foreground">
                   <span>{membership.points} pts</span>
                   <ArrowRight className="h-4 w-4" />
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
