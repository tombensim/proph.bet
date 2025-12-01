import { NextRequest } from "next/server"
import { validateApiRequest, apiResponse, apiError } from "@/lib/api-auth"
import { getUserProfile } from "@/lib/services/user-service"

/**
 * GET /api/v1/auth/me
 * Get current user profile
 */
export async function GET(req: NextRequest) {
  const auth = await validateApiRequest(req)
  
  if ("error" in auth) {
    return auth.error
  }

  try {
    const profile = await getUserProfile(auth.user.id)
    
    if (!profile) {
      return apiError("User not found", 404)
    }

    return apiResponse(profile)
  } catch (error) {
    console.error("Get profile error:", error)
    return apiError("Internal server error", 500)
  }
}
