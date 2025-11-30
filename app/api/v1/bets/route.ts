import { NextRequest } from "next/server"
import { validateApiRequest, apiResponse, apiError } from "@/lib/api-auth"
import { placeBet } from "@/lib/services/bet-service"
import { getUserBets } from "@/lib/services/user-service"

/**
 * GET /api/v1/bets
 * Get current user's bets
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
    const bets = await getUserBets(auth.user.id, arenaId, limit)
    return apiResponse(bets)
  } catch (error) {
    console.error("Get bets error:", error)
    return apiError("Internal server error", 500)
  }
}

/**
 * POST /api/v1/bets
 * Place a new bet
 */
export async function POST(req: NextRequest) {
  const auth = await validateApiRequest(req)
  
  if ("error" in auth) {
    return auth.error
  }

  try {
    const body = await req.json()
    const { marketId, amount, optionId, numericValue, idempotencyKey } = body

    if (!marketId || !amount) {
      return apiError("marketId and amount are required", 400)
    }

    if (typeof amount !== "number" || amount <= 0) {
      return apiError("amount must be a positive number", 400)
    }

    const result = await placeBet({
      userId: auth.user.id,
      marketId,
      amount,
      optionId,
      numericValue,
      idempotencyKey
    })

    return apiResponse(result, 201)
  } catch (error) {
    console.error("Place bet error:", error)
    if (error instanceof Error) {
      return apiError(error.message, 400)
    }
    return apiError("Internal server error", 500)
  }
}
