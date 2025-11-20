"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateAnalystSentiment, AnalystPersona } from "@/lib/gemini"
import { revalidatePath } from "next/cache"
import { LLMUsageType } from "@prisma/client"

export async function analyzeMarketSentiment({
  marketId,
  triggerEvent
}: {
  marketId: string
  triggerEvent: string
}) {
  const session = await auth()
  
  // Analysis can happen in background, but we need to know who triggered it for context (though not strictly required for auth if called internally)
  // However, usually actions are called by users. 
  if (!session?.user?.id) {
     // Allow system calls if we had a way to verify, but for now just return if no user
     // Actually, for async processing after a bet, we might just want to proceed. 
     // But since this is a server action called from the client (via another action), we should have a session.
  }

  try {
    // 1. Fetch Market & Arena Settings
    const market = await prisma.market.findUnique({
      where: { id: marketId },
      include: {
        arena: {
          include: {
            settings: true
          }
        },
        options: true
      }
    })

    if (!market || !market.arena || !market.arena.settings) {
      console.error("Market or Arena Settings not found for sentiment analysis")
      return
    }

    const settings = market.arena.settings
    // Safe cast the JSON
    const analysts = (settings.analysts as unknown as AnalystPersona[]) || []

    if (analysts.length === 0) {
      return // No analysts configured
    }

    // 2. Prepare Market Context
    let currentProbability = ""
    if (market.type === "BINARY" && market.options.length >= 2) {
        const yes = market.options.find(o => o.text.toLowerCase() === "yes")
        const no = market.options.find(o => o.text.toLowerCase() === "no")
        if (yes && no) {
            const total = yes.liquidity + no.liquidity
            if (total > 0) {
                 const prob = (no.liquidity / total) * 100
                 currentProbability = `${prob.toFixed(1)}% Yes`
            }
        }
    }

    // 3. Analyze for each analyst
    // We run these in parallel
    await Promise.all(analysts.map(async (analyst) => {
        // Helper to generate ID if not present in config (should be there though)
        const analystId = analyst.name // Simple ID for now, or use a UUID if we added one to the config interface
        
        try {
            const result = await generateAnalystSentiment({
                marketTitle: market.title,
                marketDescription: market.description,
                currentProbability,
                recentActivity: triggerEvent,
                analyst,
                context: {
                    arenaId: market.arenaId!,
                    marketId: market.id,
                    userId: session?.user?.id // Optional
                }
            })

            // 4. Store Result
            await prisma.analystSentiment.upsert({
                where: {
                    marketId_analystId: {
                        marketId: market.id,
                        analystId: analystId
                    }
                },
                create: {
                    marketId: market.id,
                    analystId: analystId,
                    sentiment: result.sentiment,
                    rating: result.rating
                },
                update: {
                    sentiment: result.sentiment,
                    rating: result.rating
                }
            })

        } catch (err) {
            console.error(`Failed to generate sentiment for analyst ${analyst.name}:`, err)
        }
    }))

    revalidatePath(`/arenas/${market.arenaId}/markets/${marketId}`)
    
  } catch (error) {
    console.error("Error in analyzeMarketSentiment:", error)
  }
}

