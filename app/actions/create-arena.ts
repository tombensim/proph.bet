"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { z } from "zod"
import { ArenaRole } from "@prisma/client"

const createArenaSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  slug: z.string().min(3, "Slug must be at least 3 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
})

export type CreateArenaValues = z.infer<typeof createArenaSchema>

export async function createArenaAction(data: CreateArenaValues) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (user?.role !== "ADMIN" && user?.role !== "GLOBAL_ADMIN") throw new Error("Unauthorized: Only system admins and global admins can create arenas")

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
      }
    }
  })

  redirect(`/en/arenas/${arena.id}/setup`)
}

