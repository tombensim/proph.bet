import { NextRequest } from "next/server"
import { validateApiRequest, apiResponse, apiError } from "@/lib/api-auth"
import { transferPoints } from "@/lib/services/transfer-service"

/**
 * POST /api/v1/transfers
 * Transfer points to another user
 */
export async function POST(req: NextRequest) {
  const auth = await validateApiRequest(req)
  
  if ("error" in auth) {
    return auth.error
  }

  try {
    const body = await req.json()
    const { toUserEmail, amount, arenaId } = body

    if (!toUserEmail || !amount || !arenaId) {
      return apiError("toUserEmail, amount, and arenaId are required", 400)
    }

    if (typeof amount !== "number" || amount <= 0) {
      return apiError("amount must be a positive number", 400)
    }

    const result = await transferPoints({
      userId: auth.user.id,
      userEmail: auth.user.email,
      toUserEmail,
      amount,
      arenaId
    })

    return apiResponse(result, 201)
  } catch (error) {
    console.error("Transfer points error:", error)
    if (error instanceof Error) {
      return apiError(error.message, 400)
    }
    return apiError("Internal server error", 500)
  }
}
