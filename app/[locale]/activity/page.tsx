import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ActivityList } from "@/components/activity/activity-list"
import { ArenaFilter } from "./arena-filter"

interface ActivityPageProps {
  searchParams: Promise<{ arenaId?: string }>
}

export default async function ActivityPage({
  searchParams,
}: ActivityPageProps) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return redirect("/api/auth/signin")
  }

  const resolvedSearchParams = await searchParams
  const arenaId = resolvedSearchParams.arenaId

  // Fetch user memberships to populate the filter
  const memberships = await prisma.arenaMembership.findMany({
    where: { 
      userId: session.user.id,
      arena: { archivedAt: null }
    },
    include: { 
      arena: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  const arenas = memberships.map(m => ({
    id: m.arena.id,
    name: m.arena.name
  }))

  // Fetch notifications
  const whereClause: any = {
    userId: session.user.id,
  }

  if (typeof arenaId === "string" && arenaId) {
    whereClause.arenaId = arenaId
  }

  const notifications = await prisma.notification.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      arena: {
        select: { id: true, name: true }
      }
    }
  })

  return (
    <div className="container max-w-2xl py-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold">Activity Center</h1>
        <ArenaFilter arenas={arenas} />
      </div>
      
      <ActivityList notifications={notifications} />
    </div>
  )
}

