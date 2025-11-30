import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateAccessToken, generateRefreshToken, verifyToken, apiError, apiResponse } from "@/lib/api-auth"
import { OAuth2Client } from "google-auth-library"

const googleClient = new OAuth2Client(process.env.AUTH_GOOGLE_ID)

/**
 * POST /api/v1/auth/token
 * Exchange Google ID token for app tokens
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { idToken, grantType } = body

    if (grantType === "google") {
      // Verify Google ID token
      if (!idToken) {
        return apiError("Missing idToken", 400)
      }

      let payload
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken,
          audience: process.env.AUTH_GOOGLE_ID
        })
        payload = ticket.getPayload()
      } catch (e) {
        console.error("Google token verification failed:", e)
        return apiError("Invalid Google token", 401)
      }

      if (!payload?.email) {
        return apiError("Invalid token payload", 401)
      }

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email: payload.email }
      })

      if (!user) {
        // Create new user
        user = await prisma.user.create({
          data: {
            email: payload.email,
            name: payload.name || null,
            image: payload.picture || null,
            emailVerified: new Date()
          }
        })
      }

      // Generate tokens
      const accessToken = await generateAccessToken(user.id, user.email)
      const refreshToken = await generateRefreshToken(user.id, user.email)

      return apiResponse({
        accessToken,
        refreshToken,
        expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role
        }
      })
    }

    if (grantType === "refresh_token") {
      const { refreshToken } = body
      
      if (!refreshToken) {
        return apiError("Missing refreshToken", 400)
      }

      const payload = await verifyToken(refreshToken)
      
      if (!payload || payload.type !== "refresh") {
        return apiError("Invalid refresh token", 401)
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.userId }
      })

      if (!user) {
        return apiError("User not found", 401)
      }

      // Generate new access token
      const newAccessToken = await generateAccessToken(user.id, user.email)

      return apiResponse({
        accessToken: newAccessToken,
        expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role
        }
      })
    }

    return apiError("Invalid grantType", 400)
  } catch (error) {
    console.error("Token exchange error:", error)
    return apiError("Internal server error", 500)
  }
}
