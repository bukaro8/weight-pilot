import {z} from "zod";

export const reportIdSchema = z.uuid();
export const reportAssessmentSchema = z.object({
  recommendedTreatment: z.enum(["SEMAGLUTIDE", "TIRZEPATIDE", "REVIEW_REQUIRED"]),
  confidence: z.enum(["HIGH", "MODERATE", "INSUFFICIENT_INFORMATION"]),
  reason: z.string().trim().min(1).max(1200).refine((value) => value.split(/\s+/u).filter(Boolean).length <= 60, "Reason must be no more than 60 words."),
  requiresMedicalReview: z.boolean(),
}).strict().superRefine((value, context) => {
  if (value.recommendedTreatment === "REVIEW_REQUIRED" && !value.requiresMedicalReview) {
    context.addIssue({code: "custom", path: ["requiresMedicalReview"], message: "A required review must be marked true."});
  }
  if (value.confidence === "INSUFFICIENT_INFORMATION" && (value.recommendedTreatment !== "REVIEW_REQUIRED" || !value.requiresMedicalReview)) {
    context.addIssue({code: "custom", path: ["recommendedTreatment"], message: "Insufficient information requires further review."});
  }
  if (value.recommendedTreatment !== "REVIEW_REQUIRED" && value.confidence === "INSUFFICIENT_INFORMATION") {
    context.addIssue({code: "custom", path: ["confidence"], message: "Insufficient information requires review."});
  }
});

export function parseReportAssessment(content: string) {
  try {
    return reportAssessmentSchema.safeParse(JSON.parse(content));
  } catch {
    return reportAssessmentSchema.safeParse(null);
  }
}

export const reportDraftSchema = z.object({
  language: z.enum(["en", "es"]),
  content: z.string().trim().max(30_000).refine((value) => parseReportAssessment(value).success, "A valid report assessment JSON is required."),
  includeSavingsComparison: z.boolean().default(false),
}).strict();

export const reportSendSchema = z.object({confirm: z.literal(true)});
