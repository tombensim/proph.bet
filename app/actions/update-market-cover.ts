"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AssetType } from "@prisma/client"
import { revalidatePath } from "next/cache"

// Updates the cover image for a market
export async function updateMarketCoverAction(marketId: string, imageUrl: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: { creatorId: true, arenaId: true }
  })

  if (!market) throw new Error("Market not found")

  if (market.creatorId !== session.user.id) {
    throw new Error("Only the creator can edit the cover photo")
  }

  // Find existing IMAGE asset
  const existingImage = await prisma.marketAsset.findFirst({
    where: {
      marketId,
      type: AssetType.IMAGE
    }
  })

  if (existingImage) {
    await prisma.marketAsset.update({
      where: { id: existingImage.id },
      data: { url: imageUrl }
    })
  } else {
    await prisma.marketAsset.create({
      data: {
        marketId,
        type: AssetType.IMAGE,
        url: imageUrl,
        label: "Cover Image"
      }
    })
  }

  revalidatePath(`/arenas/${market.arenaId}/markets/${marketId}`)
}
