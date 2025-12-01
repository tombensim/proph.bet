import { NextRequest } from "next/server"
import { validateApiRequest, apiResponse, apiError } from "@/lib/api-auth"
import { getMarkets, createMarket } from "@/lib/services/market-service"
import { MarketStatus, MarketType } from "@prisma/client"

interface Params {
  params: Promise<{ arenaId: string }>
}

/**
 * GET /api/v1/arenas/:arenaId/markets
 * Get markets for an arena
 */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await validateApiRequest(req)
  
  if ("error" in auth) {
    return auth.error
  }

  const { arenaId } = await params
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") as MarketStatus | null
  const limit = parseInt(searchParams.get("limit") || "50")
  const offset = parseInt(searchParams.get("offset") || "0")

  try {
    const markets = await getMarkets({
      arenaId,
      userId: auth.user.id,
      status: status || undefined,
      limit,
      offset
    })
    return apiResponse(markets)
  } catch (error) {
    console.error("Get markets error:", error)
    return apiError("Internal server error", 500)
  }
}

/**
 * POST /api/v1/arenas/:arenaId/markets
 * Create a new market
 */
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await validateApiRequest(req)
  
  if ("error" in auth) {
    return auth.error
  }

  const { arenaId } = await params

  try {
    const body = await req.json()
    const {
      title,
      description,
      type,
      resolutionDate,
      options,
      minBet,
      maxBet,
      hiddenFromUserIds,
      hideBetsFromUserIds,
      assets
    } = body

    if (!title || !type || !resolutionDate) {
      return apiError("Title, type, and resolutionDate are required", 400)
    }

    const result = await createMarket({
      userId: auth.user.id,
      userRole: auth.user.role,
      title,
      description,
      type: type as MarketType,
      resolutionDate: new Date(resolutionDate),
      options,
      minBet,
      maxBet,
      hiddenFromUserIds,
      hideBetsFromUserIds,
      arenaId,
      assets
    })

    return apiResponse(result, 201)
  } catch (error) {
    console.error("Create market error:", error)
    if (error instanceof Error) {
      return apiError(error.message, 400)
    }
    return apiError("Internal server error", 500)
  }
}
