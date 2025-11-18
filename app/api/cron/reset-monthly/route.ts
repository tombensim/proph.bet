import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { TransactionType } from "@prisma/client"

// This route should be secured with a secret key in production
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    // 1. Snapshot current leaderboard (Optional: Store in a "Winner" table)
    // For V1, we just reset points.
    
    // 2. Reset all users to 1000 points
    await prisma.$transaction(async (tx) => {
       // Log the reset for audit (optional, might be heavy for all users)
       // Instead, we just update everyone.
       await tx.user.updateMany({
         data: {
           points: 1000
         }
       })
       
       // Create a record that reset happened? 
       // Maybe just return success.
    })

    return NextResponse.json({ success: true, message: "Monthly reset completed" })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: "Failed to reset" }, { status: 500 })
  }
}

