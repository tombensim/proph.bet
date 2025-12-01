import { NextRequest } from "next/server"
import { validateApiRequest, apiResponse, apiError } from "@/lib/api-auth"
import { getArena, getArenaMembership } from "@/lib/services/arena-service"

interface Params {
  params: Promise<{ arenaId: string }>
}

/**
 * GET /api/v1/arenas/:arenaId
 * Get arena details
 */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await validateApiRequest(req)
  
  if ("error" in auth) {
    return auth.error
  }

  const { arenaId } = await params

  try {
    const arena = await getArena(arenaId)
    
    if (!arena) {
      return apiError("Arena not found", 404)
    }

    // Get user's membership
    const membership = await getArenaMembership(auth.user.id, arena.id)

    return apiResponse({
      ...arena,
      membership: membership ? {
        role: membership.role,
        points: membership.points,
        joinedAt: membership.joinedAt
      } : null
    })
  } catch (error) {
    console.error("Get arena error:", error)
    return apiError("Internal server error", 500)
  }
}
