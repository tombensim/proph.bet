"use server";

import { generateMarketDescription } from "@/lib/gemini";
import { auth } from "@/lib/auth";

export async function generateDescriptionAction({
  title,
  type,
  options,
  resolutionDate,
}: {
  title: string;
  type: "BINARY" | "MULTIPLE_CHOICE" | "NUMERIC_RANGE";
  options?: string[];
  resolutionDate?: Date;
}): Promise<{ description?: string; error?: string }> {
  // Check if user is authenticated
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  if (!title || title.trim().length < 10) {
    return { error: "Title must be at least 10 characters" };
  }

  try {
    const description = await generateMarketDescription({
      title,
      type,
      options,
      resolutionDate,
    });
    return { description };
  } catch (error) {
    console.error("Description generation failed:", error);
    return { error: "Failed to generate description. Please try again." };
  }
}

