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
  pharmacyEstimate: z.object({
    treatment: z.enum(["SEMAGLUTIDE", "TIRZEPATIDE"]),
    amountPence: z.number().int().min(1).max(100_000_000),
    periodMonths: z.number().int().min(1).max(16),
    sourceName: z.string().trim().min(2).max(120),
    sourceUrl: z.url().refine((value) => {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    }, "A public HTTPS source URL is required"),
    asOfDate: z.iso.date(),
  }).nullable(),
}).superRefine((value, context) => {
  if (value.pharmacyEstimate && (!value.referenceScenario || value.pharmacyEstimate.treatment !== value.referenceScenario.treatment)) {
    context.addIssue({code: "custom", message: "PHARMACY_ESTIMATE_MUST_MATCH_REFERENCE_TREATMENT", path: ["pharmacyEstimate", "treatment"]});
  }
});

export const reportSendSchema = z.object({confirm: z.literal(true)});
