import { NextRequest } from "next/server"
import { validateApiRequest, apiResponse, apiError } from "@/lib/api-auth"
import { getArenaLeaderboard } from "@/lib/services/arena-service"

interface Params {
  params: Promise<{ arenaId: string }>
}

/**
 * GET /api/v1/arenas/:arenaId/leaderboard
 * Get arena leaderboard
 */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await validateApiRequest(req)
  
  if ("error" in auth) {
    return auth.error
  }

  const { arenaId } = await params
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get("limit") || "50")

  try {
    const leaderboard = await getArenaLeaderboard(arenaId, limit)
    return apiResponse(leaderboard)
  } catch (error) {
    console.error("Get leaderboard error:", error)
    return apiError("Internal server error", 500)
  }
}
