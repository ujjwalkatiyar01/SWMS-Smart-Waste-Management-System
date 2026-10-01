import { z } from "zod";

export const aiResultSchema = z.object({
  category: z.enum(["wet", "dry", "biomedical", "hazardous", "e_waste", "mixed_uncertain"]),
  confidence: z.enum(["high", "medium", "low"]),
  hazard: z.boolean(),
  visible_items: z.array(z.string().max(80)).max(10),
  reason: z.string().max(240),
});
export type AiResult = z.infer<typeof aiResultSchema>;

export const uncertain: AiResult = {
  category: "mixed_uncertain", confidence: "low", hazard: false,
  visible_items: [], reason: "The photo could not be classified reliably.",
};
