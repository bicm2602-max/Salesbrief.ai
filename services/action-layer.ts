import { z } from "zod";

export const actionEvidenceLevelSchema = z.enum(["strong", "moderate", "hypothesis"]);

export const actionLayerSchema = z.object({
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  priorityReason: z.string().min(1).max(500),
  whyNow: z.object({
    statement: z.string().min(1).max(600),
    evidenceLevel: actionEvidenceLevelSchema,
  }),
  whoToContact: z.object({
    primary: z.object({ role: z.string().min(1).max(160), reason: z.string().min(1).max(400) }),
    secondary: z.object({ role: z.string().min(1).max(160), reason: z.string().min(1).max(400) }).optional(),
  }),
  painToLeadWith: z.object({
    verifiedFact: z.string().min(1).max(500),
    hypothesis: z.string().min(1).max(500),
  }),
  recommendedSalesAngle: z.string().min(1).max(700),
  bestNextAction: z.string().min(1).max(500),
  outreachStarter: z.object({
    coldEmailOpening: z.string().min(1).max(500),
    linkedinOpening: z.string().min(1).max(500),
    coldCallOpener: z.string().min(1).max(500),
  }),
});

export type ActionLayer = z.infer<typeof actionLayerSchema>;
