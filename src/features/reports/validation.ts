import {z} from "zod";

export const reportIdSchema = z.uuid();
export const reportDraftSchema = z.object({
  language: z.enum(["en", "es"]),
  content: z.string().trim().max(30_000),
  referenceScenario: z.object({
    treatment: z.enum(["SEMAGLUTIDE", "TIRZEPATIDE"]),
    durationMonths: z.union([z.literal(6), z.literal(12), z.literal(16)]),
    deliveryMethod: z.enum(["STANDARD_NEXT_DAY", "GUARANTEED_NEXT_DAY"]),
  }).nullable(),
  pharmacyReferencePriceId: z.uuid().nullable(),
  preserveExistingPharmacyEstimate: z.boolean().default(false),
}).strict();

export const reportSendSchema = z.object({confirm: z.literal(true)});
