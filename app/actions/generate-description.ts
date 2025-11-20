"use server";

import { generateMarketDescription, generateArenaAbout } from "@/lib/gemini";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ArenaRole, Role } from "@prisma/client";

export async function generateDescriptionAction({
  title,
  type,
  options,
  resolutionDate,
  arenaId,
}: {
  title: string;
  type: "BINARY" | "MULTIPLE_CHOICE" | "NUMERIC_RANGE";
  options?: string[];
  resolutionDate?: Date;
  arenaId?: string;
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
      context: {
        userId: session.user.id,
        arenaId,
      },
    });
    return { description };
  } catch (error) {
    console.error("Description generation failed:", error);
    return { error: "Failed to generate description. Please try again." };
  }
}

export async function generateArenaAboutAction({
  arenaId,
  name,
  description,
}: {
  arenaId: string;
  name: string;
  description?: string;
}): Promise<{ about?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  // Verify Admin Access
  const isAdmin = session.user.role === Role.ADMIN || session.user.role === Role.GLOBAL_ADMIN;
  
  if (!isAdmin) {
    const membership = await prisma.arenaMembership.findUnique({
      where: {
        userId_arenaId: {
          userId: session.user.id,
          arenaId,
        },
      },
    });

    if (!membership || membership.role !== ArenaRole.ADMIN) {
      return { error: "Unauthorized: Arena Admin required" };
    }
  }

  try {
    const about = await generateArenaAbout({
      name,
      description,
      context: {
        userId: session.user.id,
        arenaId,
      },
    });
    return { about };
  } catch (error) {
    console.error("Arena About generation failed:", error);
    return { error: "Failed to generate content. Please try again." };
  }
}
