import { NextRequest } from "next/server"
import { validateApiRequest, apiResponse, apiError } from "@/lib/api-auth"
import { getArenas, createArena } from "@/lib/services/arena-service"

/**
 * GET /api/v1/arenas
 * Get arenas for the current user
 */
export async function GET(req: NextRequest) {
  const auth = await validateApiRequest(req)
  
  if ("error" in auth) {
    return auth.error
  }

  try {
    const arenas = await getArenas({ userId: auth.user.id })
    return apiResponse(arenas)
  } catch (error) {
    console.error("Get arenas error:", error)
    return apiError("Internal server error", 500)
  }
}

/**
 * POST /api/v1/arenas
 * Create a new arena
 */
export async function POST(req: NextRequest) {
  const auth = await validateApiRequest(req)
  
  if ("error" in auth) {
    return auth.error
  }

  try {
    const body = await req.json()
    const { name, description, slug } = body

    if (!name || !slug) {
      return apiError("Name and slug are required", 400)
    }

    const result = await createArena({
      userId: auth.user.id,
      userEmail: auth.user.email,
      userRole: auth.user.role,
      name,
      description,
      slug
    })

    return apiResponse(result, 201)
  } catch (error) {
    console.error("Create arena error:", error)
    if (error instanceof Error) {
      return apiError(error.message, 400)
    }
    return apiError("Internal server error", 500)
  }
}
