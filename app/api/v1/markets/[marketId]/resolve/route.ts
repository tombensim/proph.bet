import { NextRequest } from "next/server"
import { validateApiRequest, apiResponse, apiError } from "@/lib/api-auth"
import { resolveMarket } from "@/lib/services/market-service"

interface Params {
  params: Promise<{ marketId: string }>
}

/**
 * POST /api/v1/markets/:marketId/resolve
 * Resolve a market
 */
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await validateApiRequest(req)
  
  if ("error" in auth) {
    return auth.error
  }

  const { marketId } = await params

  try {
    const body = await req.json()
    const { winningOptionId, winningValue, resolutionImage } = body

    const result = await resolveMarket({
      userId: auth.user.id,
      userRole: auth.user.role,
      marketId,
      winningOptionId,
      winningValue,
      resolutionImage
    })

    // Convert Map to object for JSON serialization
    const payoutsObj: Record<string, number> = {}
    result.payouts.forEach((value, key) => {
      payoutsObj[key] = value
    })

    return apiResponse({
      ...result,
      payouts: payoutsObj
    })
  } catch (error) {
    console.error("Resolve market error:", error)
    if (error instanceof Error) {
      return apiError(error.message, 400)
    }
    return apiError("Internal server error", 500)
  }
}
