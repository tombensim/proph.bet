import { Navbar } from "@/components/layout/Navbar"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

interface ArenaLayoutProps {
  children: React.ReactNode
  params: Promise<{ arenaId: string }>
}

export default async function ArenaLayout({ children, params }: ArenaLayoutProps) {
  const session = await auth()
  if (!session?.user?.id) redirect("/api/auth/signin")

  const { arenaId } = await params

  // Verify membership
  const membership = await prisma.arenaMembership.findUnique({
    where: {
      userId_arenaId: {
        userId: session.user.id,
        arenaId
      }
    }
  })

  if (!membership) {
    // If not a member, redirect to root
    redirect("/")
  }

  return (
    <>
      <Navbar arenaId={arenaId} />
      {children}
    </>
  )
}

