import { NextRequest } from "next/server"
import { validateApiRequest, apiResponse, apiError } from "@/lib/api-auth"
import { getMarket } from "@/lib/services/market-service"

interface Params {
  params: Promise<{ marketId: string }>
}

/**
 * GET /api/v1/markets/:marketId
 * Get market details
 */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await validateApiRequest(req)
  
  if ("error" in auth) {
    return auth.error
  }

  const { marketId } = await params

  try {
    const market = await getMarket(marketId, auth.user.id)
    
    if (!market) {
      return apiError("Market not found", 404)
    }

    return apiResponse(market)
  } catch (error) {
    console.error("Get market error:", error)
    return apiError("Internal server error", 500)
  }
}
