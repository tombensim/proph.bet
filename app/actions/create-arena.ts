"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { z } from "zod"
import { ArenaRole } from "@prisma/client"
import { isSystemAdmin } from "@/lib/roles"

const createArenaSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  slug: z.string().min(3, "Slug must be at least 3 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
})

export type CreateArenaValues = z.infer<typeof createArenaSchema>

// Default analysts configuration
const DEFAULT_ANALYSTS = [
    {
        name: "Risk Taker",
        prompt: "You are a high-risk, high-reward trader. You love volatility and underdog stories. You get excited about big bets and dramatic swings. Your tone is energetic, slightly reckless, and momentum-driven. You often use trading slang."
    },
    {
        name: "Conservative Sage",
        prompt: "You are a risk-averse, seasoned investor. You value stability, historical trends, and logical probabilities. You are skeptical of hype and quick movements. Your tone is calm, professional, warning about downside risks, and focused on fundamentals."
    },
    {
        name: "Contrarian",
        prompt: "You always look for the counter-narrative. If everyone is buying, you are looking to sell. You are skeptical of the crowd wisdom and look for value in the unpopular opinion. Your tone is cynical, questioning, and provocative."
    }
]

export async function createArenaAction(data: CreateArenaValues) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  
  const isSysAdmin = isSystemAdmin(user?.email)
  if (!isSysAdmin && user?.role !== "ADMIN" && user?.role !== "GLOBAL_ADMIN") {
    throw new Error("Unauthorized: Only system admins and global admins can create arenas")
  }

  const validated = createArenaSchema.safeParse(data)
  if (!validated.success) {
    throw new Error("Invalid data")
  }

  const { name, description, slug } = validated.data

  // Check slug uniqueness
  const existing = await prisma.arena.findUnique({ where: { slug } })
  if (existing) throw new Error("Arena with this slug already exists")

  const arena = await prisma.arena.create({
    data: {
      name,
      description,
      slug,
      members: {
        create: {
          userId: session.user.id,
          role: ArenaRole.ADMIN,
          points: 1000 // Initial points for creator in new arena
        }
      },
      settings: {
        create: {
          limitMultipleBets: true,
          multiBetThreshold: 3,
          analysts: DEFAULT_ANALYSTS as any // Initialize with default analysts
        }
      }
    }
  })

  redirect(`/en/arenas/${arena.id}/setup`)
}
