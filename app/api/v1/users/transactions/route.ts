import { NextRequest } from "next/server"
import { validateApiRequest, apiResponse, apiError } from "@/lib/api-auth"
import { getUserTransactions } from "@/lib/services/user-service"

/**
 * GET /api/v1/users/transactions
 * Get current user's transaction history
 */
export async function GET(req: NextRequest) {
  const auth = await validateApiRequest(req)
  
  if ("error" in auth) {
    return auth.error
  }

  const { searchParams } = new URL(req.url)
  const arenaId = searchParams.get("arenaId") || undefined
  const limit = parseInt(searchParams.get("limit") || "50")

  try {
    const transactions = await getUserTransactions(auth.user.id, arenaId, limit)
    return apiResponse(transactions)
  } catch (error) {
    console.error("Get transactions error:", error)
    return apiError("Internal server error", 500)
  }
}
