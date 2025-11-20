"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { analyzeMarketSentiment } from "./analyze-sentiment"

export async function createComment(marketId: string, content: string) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return { error: "You must be signed in to comment" }
  }

  if (!content || content.trim().length === 0) {
    return { error: "Comment cannot be empty" }
  }

  if (content.length > 2000) {
    return { error: "Comment is too long (max 2000 characters)" }
  }

  try {
    // Verify market exists
    const market = await prisma.market.findUnique({
      where: { id: marketId },
      select: { id: true }
    })

    if (!market) {
      return { error: "Market not found" }
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        userId: session.user.id,
        marketId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        }
      }
    })

    // Trigger Analyst Sentiment (fire and forget - non-blocking)
    analyzeMarketSentiment({
        marketId: market.id,
        triggerEvent: `User commented: "${content.trim().substring(0, 100)}${content.length > 100 ? '...' : ''}"`
    }).catch(err => {
        console.error("Failed to trigger analyst sentiment in background:", err)
    })

    revalidatePath(`/markets/${marketId}`)
    return { success: true, comment }
  } catch (error) {
    console.error("Error creating comment:", error)
    return { error: "Failed to create comment" }
  }
}

export async function updateComment(commentId: string, content: string) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return { error: "You must be signed in to update comments" }
  }

  if (!content || content.trim().length === 0) {
    return { error: "Comment cannot be empty" }
  }

  if (content.length > 2000) {
    return { error: "Comment is too long (max 2000 characters)" }
  }

  try {
    // Find the comment and verify ownership
    const existingComment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true, marketId: true }
    })

    if (!existingComment) {
      return { error: "Comment not found" }
    }

    if (existingComment.userId !== session.user.id) {
      return { error: "You can only edit your own comments" }
    }

    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: { content: content.trim() },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        }
      }
    })

    revalidatePath(`/markets/${existingComment.marketId}`)
    return { success: true, comment }
  } catch (error) {
    console.error("Error updating comment:", error)
    return { error: "Failed to update comment" }
  }
}

export async function deleteComment(commentId: string) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return { error: "You must be signed in to delete comments" }
  }

  try {
    // Find the comment
    const existingComment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true, marketId: true }
    })

    if (!existingComment) {
      return { error: "Comment not found" }
    }

    // Get current user info to check if they're an admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    // Check permissions: must be comment author or admin
    const isAuthor = existingComment.userId === session.user.id
    const isAdmin = currentUser?.role === "ADMIN"

    if (!isAuthor && !isAdmin) {
      return { error: "You can only delete your own comments or must be an admin" }
    }

    await prisma.comment.delete({
      where: { id: commentId }
    })

    revalidatePath(`/markets/${existingComment.marketId}`)
    return { success: true }
  } catch (error) {
    console.error("Error deleting comment:", error)
    return { error: "Failed to delete comment" }
  }
}

export async function getComments(marketId: string) {
  try {
    const comments = await prisma.comment.findMany({
      where: { marketId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return { success: true, comments }
  } catch (error) {
    console.error("Error fetching comments:", error)
    return { error: "Failed to fetch comments" }
  }
}
