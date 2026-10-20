import {z} from "zod";

import {healthConsiderationKeys} from "@/features/assessment/types";
import {assessmentDecisionReasonKeys} from "@/features/assessment/decision";

export const assessmentOutcomeSchema = z.object({
  engineVersion: z.literal(2),
  bmi: z.number().finite().positive().nullable(),
  targetWeightLossPercentage: z.number().finite().positive().nullable(),
  age: z.number().int().min(18).max(120).nullable(),
  sexAssignedAtBirth: z.enum(["FEMALE", "MALE", "INTERSEX", "PREFER_NOT_TO_SAY"]).nullable(),
  currentWeightKg: z.number().positive().nullable(),
  targetWeightKg: z.number().positive().nullable(),
  considerations: z.array(z.enum(healthConsiderationKeys)),
  requiresIndividualAssessment: z.boolean(),
  medicationInformation: z.enum(["NONE_REPORTED", "PROVIDED", "INCOMPLETE"]),
  decisionStatus: z.enum(["REVIEW_REQUIRED", "DISCUSS_TREATMENT"]),
  treatmentToDiscuss: z.enum(["TIRZEPATIDE"]).nullable(),
  decisionReasons: z.array(z.enum(assessmentDecisionReasonKeys)),
});

export const reviewRequestSchema = z.object({
  questionnaireId: z.uuid(),
  reportLanguage: z.enum(["en", "es"]),
}).strict();
export const reviewStatusUpdateSchema = z.object({status: z.enum(["REQUESTED", "IN_REVIEW", "COMPLETED"])});
export const reviewRequestIdSchema = z.uuid();
