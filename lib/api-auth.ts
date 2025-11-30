import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { SignJWT, jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "fallback-secret-change-me")

export interface ApiUser {
  id: string
  email: string
  name: string | null
  role: string
}

export interface TokenPayload {
  userId: string
  email: string
  type: "access" | "refresh"
  exp?: number
}

/**
 * Generate access token (short-lived)
 */
export async function generateAccessToken(userId: string, email: string): Promise<string> {
  const token = await new SignJWT({ userId, email, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(JWT_SECRET)
  
  return token
}

/**
 * Generate refresh token (long-lived)
 */
export async function generateRefreshToken(userId: string, email: string): Promise<string> {
  const token = await new SignJWT({ userId, email, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET)
  
  return token
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as TokenPayload
  } catch {
    return null
  }
}

/**
 * Validate API request and extract user
 * Returns user or error response
 */
export async function validateApiRequest(req: NextRequest): Promise<{ user: ApiUser } | { error: NextResponse }> {
  const authHeader = req.headers.get("authorization")
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { success: false, error: "Missing or invalid authorization header" },
        { status: 401 }
      )
    }
  }

  const token = authHeader.substring(7)
  const payload = await verifyToken(token)
  
  if (!payload) {
    return {
      error: NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      )
    }
  }

  if (payload.type !== "access") {
    return {
      error: NextResponse.json(
        { success: false, error: "Invalid token type" },
        { status: 401 }
      )
    }
  }

  // Fetch user from database
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true
    }
  })

  if (!user) {
    return {
      error: NextResponse.json(
        { success: false, error: "User not found" },
        { status: 401 }
      )
    }
  }

  return { user }
}

/**
 * Helper to create API response
 */
export function apiResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * Helper to create API error response
 */
export function apiError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}
