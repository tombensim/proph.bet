import { z } from "zod";
import { MarketType, AssetType } from "./types";

const marketAssetSchema = z.object({
  type: z.nativeEnum(AssetType),
  url: z.string().url("Must be a valid URL"),
  label: z.string().optional(),
});

export const createMarketSchema = z
  .object({
    title: z.string().min(5, "Title must be at least 5 characters"),
    description: z.string().optional(),
    type: z.nativeEnum(MarketType),
    resolutionDate: z.coerce.date({
      message: "A resolution date is required.",
    }),
    options: z.array(z.object({ value: z.string() })).optional(),
    minBet: z.coerce.number().optional(),
    maxBet: z.coerce.number().optional(),
    // Numeric Range Generation Helpers
    rangeMin: z.coerce.number().optional(),
    rangeMax: z.coerce.number().optional(),
    rangeBins: z.coerce.number().optional(),
    hiddenFromUserIds: z.array(z.string()).optional(),
    hideBetsFromUserIds: z.array(z.string()).optional(),
    arenaId: z.string().min(1, "Arena ID is required"),
    assets: z.array(marketAssetSchema).optional(),
  })
  .refine(
    (data) => {
      if (data.type === MarketType.MULTIPLE_CHOICE) {
        return data.options && data.options.length >= 2;
      }
      return true;
    },
    {
      message: "Multiple choice markets must have at least 2 options",
      path: ["options"],
    }
  );

export type CreateMarketValues = z.infer<typeof createMarketSchema>;
export type MarketAssetValues = z.infer<typeof marketAssetSchema>;

export const placeBetSchema = z.object({
  marketId: z.string(),
  amount: z.number().int().positive("Bet amount must be positive"),
  optionId: z.string().optional(),
  numericValue: z.number().optional(),
  idempotencyKey: z.string().optional(),
});

export type PlaceBetValues = z.infer<typeof placeBetSchema>;

export const createArenaSchema = z.object({
  name: z.string().min(2, "Arena name must be at least 2 characters"),
  description: z.string().optional(),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
});

export type CreateArenaValues = z.infer<typeof createArenaSchema>;

export const resolveMarketSchema = z.object({
  marketId: z.string(),
  winningOptionId: z.string().optional(),
  winningValue: z.number().optional(),
  resolutionImage: z.string().url().optional(),
});

export type ResolveMarketValues = z.infer<typeof resolveMarketSchema>;

export const transferPointsSchema = z.object({
  toUserId: z.string(),
  amount: z.number().int().positive("Amount must be positive"),
  arenaId: z.string(),
});

export type TransferPointsValues = z.infer<typeof transferPointsSchema>;
