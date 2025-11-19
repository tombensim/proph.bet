import { z } from "zod"
import { MarketType } from "@prisma/client"

export const createMarketSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().optional(),
  type: z.nativeEnum(MarketType),
  resolutionDate: z.date({
    required_error: "A resolution date is required.",
  }),
  options: z.array(z.object({ value: z.string() })).optional(),
  minBet: z.coerce.number().optional(),
  maxBet: z.coerce.number().optional(),
  hiddenFromUserIds: z.array(z.string()).optional(),
  hideBetsFromUserIds: z.array(z.string()).optional(),
  arenaId: z.string().min(1, "Arena ID is required"),
}).refine((data) => {
  if (data.type === MarketType.MULTIPLE_CHOICE) {
    return data.options && data.options.length >= 2
  }
  return true
}, {
  message: "Multiple choice markets must have at least 2 options",
  path: ["options"],
})

export type CreateMarketValues = z.infer<typeof createMarketSchema>
