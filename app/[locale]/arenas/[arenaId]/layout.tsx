import { Navbar } from "@/components/layout/Navbar"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { NewsTicker } from "@/components/arenas/news-ticker"

interface ArenaLayoutProps {
  children: React.ReactNode
  params: Promise<{ arenaId: string }>
}

export default async function ArenaLayout({ children, params }: ArenaLayoutProps) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/signin")

  const { arenaId } = await params

  // Verify membership
  const membership = await prisma.arenaMembership.findUnique({
    where: {
      userId_arenaId: {
        userId: session.user.id,
        arenaId
      }
    },
    select: { id: true } // Only select ID to check existence
  })

  if (!membership) {
    // If not a member, redirect to root
    redirect("/")
  }

  return (
    <>
      <Navbar arenaId={arenaId} />
      <NewsTicker arenaId={arenaId} />
      <div className="mt-12 lg:px-12 xl:px-24 2xl:px-32">
        {children}
      </div>
    </>
  )
}
