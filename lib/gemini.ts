import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { LLMUsageType } from "@prisma/client";

// Initialize the client
// The SDK automatically looks for GEMINI_API_KEY or GOOGLE_API_KEY
// Since we are using GEMINI_KEY, we need to pass it explicitly or ensure we set the correct env var.
// Based on docs, it looks for GEMINI_API_KEY.
// But we have GEMINI_KEY in our .env files.
// We'll pass it explicitly to be safe.

const geminiKey = process.env.GEMINI_KEY;

if (!geminiKey) {
  console.warn("GEMINI_KEY is not defined");
}

const ai = geminiKey ? new GoogleGenAI({ apiKey: geminiKey }) : null;

type TrackingContext = {
  arenaId?: string;
  marketId?: string;
  userId?: string;
};

async function trackLLMUsage(
  operation: string,
  type: LLMUsageType,
  context: TrackingContext,
  tokens?: number
) {
  try {
    await prisma.lLMUsage.create({
      data: {
        operation,
        type,
        tokens,
        arenaId: context.arenaId,
        marketId: context.marketId,
        userId: context.userId,
      },
    });
  } catch (error) {
    console.error("Failed to track LLM usage:", error);
    // Don't fail the main operation if tracking fails
  }
}

export async function generateMarketDescription({
  title,
  type,
  options,
  resolutionDate,
  context,
}: {
  title: string;
  type: "BINARY" | "MULTIPLE_CHOICE" | "NUMERIC_RANGE";
  options?: string[];
  resolutionDate?: Date;
  context?: TrackingContext;
}): Promise<string> {
  if (!ai) {
    throw new Error("GEMINI_KEY is not configured");
  }

  let prompt = `You are helping create a prediction market. Generate a clear, concise description (2-3 sentences) for the following market:

Title: "${title}"
Type: ${type}`;

  if (options && options.length > 0) {
    prompt += `\nOptions: ${options.join(", ")}`;
  }

  if (resolutionDate) {
    prompt += `\nResolution Date: ${resolutionDate.toLocaleDateString()}`;
  }

  prompt += `\n\nThe description should:
- Clearly explain what is being predicted
- Mention resolution criteria if relevant
- Be objective and neutral
- Not include any bias toward any outcome`;

  try {
    // Using the cheap and fast model as requested: gemini-2.5-flash
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    if (!response.text) {
       throw new Error("No text in response");
    }

    // Track usage
    if (context) {
      const tokens = response.usageMetadata?.totalTokenCount;
      await trackLLMUsage(
        "generateMarketDescription",
        LLMUsageType.USER_TRIGGERED,
        context,
        tokens
      );
    }
    
    return response.text.trim();
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate description");
  }
}

export async function generateArenaAbout({
  name,
  description,
  context,
}: {
  name: string;
  description?: string;
  context?: TrackingContext;
}): Promise<string> {
  if (!ai) {
    throw new Error("GEMINI_KEY is not configured");
  }

  let prompt = `You are helping manage a prediction arena (a community for prediction markets). Generate a rich, engaging "About" section in Markdown format for the following arena:

Arena Name: "${name}"`;

  if (description) {
    prompt += `\nBrief Description: "${description}"`;
  }

  prompt += `\n\nThe "About" content should:
- Be formatted in Markdown (headers, bullet points, etc.)
- Be engaging and welcoming to new members
- Explain the purpose of the arena based on its name and description
- Suggest what kind of markets or predictions users can expect
- Encourage participation
- Be around 3-4 paragraphs long`;

  try {
    // Using the cheap and fast model as requested: gemini-2.5-flash
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    if (!response.text) {
       throw new Error("No text in response");
    }

    // Track usage
    if (context) {
      const tokens = response.usageMetadata?.totalTokenCount;
      await trackLLMUsage(
        "generateArenaAbout",
        LLMUsageType.USER_TRIGGERED,
        context,
        tokens
      );
    }
    
    return response.text.trim();
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate arena about content");
  }
}

export async function generateArenaNews({
  arenaName,
  activeMarkets,
  recentBets,
  resolvedMarkets,
  context,
}: {
  arenaName: string;
  activeMarkets: { title: string; volume: number }[];
  recentBets: { marketTitle: string; amount: number; option?: string }[];
  resolvedMarkets: { title: string; outcome: string }[];
  context?: TrackingContext;
}): Promise<string[]> {
  if (!ai) {
    throw new Error("GEMINI_KEY is not configured");
  }

  let prompt = `You are a sports/finance news ticker anchor for "${arenaName}". Generate 5-7 short, punchy, exciting headlines for a scrolling news ticker based on the following activity:

Active Markets (Trending):
${activeMarkets.map((m) => `- ${m.title} (${m.volume} bets)`).join("\n")}

Recent Big Bets:
${recentBets.map((b) => `- ${b.amount} on "${b.option || "outcome"}" in "${b.marketTitle}"`).join("\n")}

Just Resolved:
${resolvedMarkets.map((m) => `- "${m.title}" resolved to: ${m.outcome}`).join("\n")}

Requirements:
- Return ONLY a JSON array of strings.
- Format: ["Headline 1", "Headline 2", ...]
- Headlines should be short (under 10 words).
- Be exciting and dramatic (use "BREAKING", "WHALE ALERT", "UPDATE").
- If data is sparse, generate generic hype messages about the arena.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!response.text) {
      throw new Error("No text in response");
    }

    // Track usage
    if (context) {
      const tokens = response.usageMetadata?.totalTokenCount;
      await trackLLMUsage(
        "generateArenaNews",
        LLMUsageType.CRON,
        context,
        tokens
      );
    }

    const headlines = JSON.parse(response.text);
    if (!Array.isArray(headlines)) {
        throw new Error("Response is not an array");
    }
    return headlines;
  } catch (error) {
    console.error("Gemini API error:", error);
    // Fallback news if generation fails
    return [
      `Welcome to ${arenaName}!`,
      "Predict the future, win big.",
      "Create your own markets today!",
    ];
  }
}
