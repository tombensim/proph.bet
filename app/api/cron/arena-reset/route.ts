import { prisma } from "@/lib/prisma"
import { ResetFrequency, WinnerRule, NotificationType } from "@prisma/client"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  // Verify Cron Secret (if configured)
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const now = new Date()

  // 1. Find arenas due for reset
  const arenasToReset = await prisma.arena.findMany({
    where: {
      settings: {
        nextResetDate: {
          lte: now
        }
      }
    },
    include: {
      settings: true,
      members: true
    }
  })

  const results = []

  for (const arena of arenasToReset) {
    if (!arena.settings) continue
    const settings = arena.settings

    try {
      await prisma.$transaction(async (tx) => {
        // A. Determine Winner
        let winnerId = null
        let winnerValue = 0

        // TODO: Implement other winner rules
        if (settings.winnerRule === WinnerRule.HIGHEST_BALANCE) {
          const winner = await tx.arenaMembership.findFirst({
            where: { arenaId: arena.id },
            orderBy: { points: 'desc' }
          })
          if (winner) {
            winnerId = winner.userId
            winnerValue = winner.points
          }
        }

        // B. Announce Winner
        if (winnerId) {
           await tx.notification.create({
             data: {
               userId: winnerId,
               type: NotificationType.MONTHLY_WINNER,
               content: `Congratulations! You won the ${arena.name} cycle with ${winnerValue} points!`,
             }
           })
        }

        // C. Reset Points
        // If carryover is disabled, reset to monthly allocation
        // If carryover is enabled, add monthly allocation to current balance (or custom logic)
        
        if (!settings.allowCarryover) {
           await tx.arenaMembership.updateMany({
             where: { arenaId: arena.id },
             data: { points: settings.monthlyAllocation ?? 1000 }
           })
        } else {
           // Add monthly allocation
           await tx.arenaMembership.updateMany({
             where: { arenaId: arena.id },
             data: { points: { increment: settings.monthlyAllocation ?? 1000 } }
           })
        }

        // D. Update Next Reset Date
        let nextDate = new Date(now)
        if (settings.resetFrequency === ResetFrequency.MONTHLY) {
            nextDate.setMonth(nextDate.getMonth() + 1)
            nextDate.setDate(1) // 1st of next month
            nextDate.setHours(0, 0, 0, 0)
        } else if (settings.resetFrequency === ResetFrequency.WEEKLY) {
            nextDate.setDate(nextDate.getDate() + 7)
        } else {
            // For MANUAL or CUSTOM, we clear the date so it doesn't loop until set again
            // Or we could leave it null for MANUAL
            nextDate = new Date(now.getFullYear() + 100, 0, 1) // far future or null logic
        }

        // If it's manual/custom and we just ran it, maybe we shouldn't auto-schedule?
        // For now, basic monthly support is key.
        if (settings.resetFrequency === ResetFrequency.MANUAL) {
            await tx.arenaSettings.update({
                where: { id: settings.id },
                data: { nextResetDate: null }
            })
        } else {
            await tx.arenaSettings.update({
                where: { id: settings.id },
                data: { nextResetDate: nextDate }
            })
        }
        
        // Notify all members
        // Optimization: Could be a lot of inserts. Maybe just notify winner?
        // Or create a system announcement model later.
      })
      
      results.push({ arena: arena.name, status: "success" })

    } catch (error) {
      console.error(`Failed to reset arena ${arena.id}`, error)
      results.push({ arena: arena.name, status: "failed", error: String(error) })
    }
  }

  return NextResponse.json({ success: true, results })
}

