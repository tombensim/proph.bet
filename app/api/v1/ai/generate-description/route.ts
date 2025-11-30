import { NextRequest } from "next/server"
import { validateApiRequest, apiResponse, apiError } from "@/lib/api-auth"
import { generateMarketDescription } from "@/lib/gemini"

/**
 * POST /api/v1/ai/generate-description
 * Generate AI description for a market
 */
export async function POST(req: NextRequest) {
  const auth = await validateApiRequest(req)
  
  if ("error" in auth) {
    return auth.error
  }

  try {
    const body = await req.json()
    const { title, type, options, resolutionDate, arenaId } = body

    if (!title || title.trim().length < 10) {
      return apiError("Title must be at least 10 characters", 400)
    }

    const description = await generateMarketDescription({
      title,
      type,
      options,
      resolutionDate: resolutionDate ? new Date(resolutionDate) : undefined,
      context: {
        userId: auth.user.id,
        arenaId,
      },
    })

    return apiResponse({ description })
  } catch (error) {
    console.error("Description generation error:", error)
    return apiError("Failed to generate description", 500)
  }
}

