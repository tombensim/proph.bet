import { NextRequest } from "next/server"
import { validateApiRequest, apiResponse, apiError } from "@/lib/api-auth"
import { getNotifications, markNotificationsRead } from "@/lib/services/user-service"

/**
 * GET /api/v1/notifications
 * Get current user's notifications
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
    const notifications = await getNotifications(auth.user.id, arenaId, limit)
    return apiResponse(notifications)
  } catch (error) {
    console.error("Get notifications error:", error)
    return apiError("Internal server error", 500)
  }
}

/**
 * PATCH /api/v1/notifications
 * Mark notifications as read
 */
export async function PATCH(req: NextRequest) {
  const auth = await validateApiRequest(req)
  
  if ("error" in auth) {
    return auth.error
  }

  try {
    const body = await req.json()
    const { notificationIds } = body

    await markNotificationsRead(auth.user.id, notificationIds)
    return apiResponse({ success: true })
  } catch (error) {
    console.error("Mark notifications read error:", error)
    return apiError("Internal server error", 500)
  }
}
