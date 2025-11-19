import { GoogleGenAI } from "@google/genai";

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

export async function generateMarketDescription({
  title,
  type,
  options,
  resolutionDate,
}: {
  title: string;
  type: "BINARY" | "MULTIPLE_CHOICE" | "NUMERIC_RANGE";
  options?: string[];
  resolutionDate?: Date;
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
    
    return response.text.trim();
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate description");
  }
}
