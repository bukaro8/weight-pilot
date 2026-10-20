import type {SexAssignedAtBirth} from "@/features/questionnaire/validation";
import type {AssessmentDecisionReasonKey, TreatmentToDiscuss} from "@/features/assessment/decision";

export const assessmentEngineVersion = 2 as const;

export const healthConsiderationKeys = [
  "DIABETES",
  "CARDIOVASCULAR",
  "KIDNEY_OR_LIVER",
  "PANCREATITIS_OR_GALLBLADDER",
  "SERIOUS_DIGESTIVE",
  "DIABETIC_EYE",
  "PREGNANCY",
  "OTHER_CONDITIONS",
  "UNCERTAIN_HEALTH_INFORMATION",
  "CURRENT_MEDICATION",
  "MEDICATION_INFORMATION_INCOMPLETE",
] as const;

export type HealthConsiderationKey = typeof healthConsiderationKeys[number];

export type AssessmentOutcome = {
  engineVersion: typeof assessmentEngineVersion;
  bmi: number | null;
  targetWeightLossPercentage: number | null;
  age: number | null;
  sexAssignedAtBirth: SexAssignedAtBirth | null;
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  considerations: HealthConsiderationKey[];
  requiresIndividualAssessment: boolean;
  medicationInformation: "NONE_REPORTED" | "PROVIDED" | "INCOMPLETE";
  decisionStatus: "REVIEW_REQUIRED" | "DISCUSS_TREATMENT";
  treatmentToDiscuss: TreatmentToDiscuss | null;
  decisionReasons: AssessmentDecisionReasonKey[];
};

export type ReviewRequestStatus = "REQUESTED" | "IN_REVIEW" | "COMPLETED";

export type MemberReviewRequest = {
  id: string;
  reportLanguage: "en" | "es";
  status: ReviewRequestStatus;
  requestedAt: string;
  updatedAt: string;
};
