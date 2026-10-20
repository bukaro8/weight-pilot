import type {HealthCondition, SexAssignedAtBirth} from "@/features/questionnaire/validation";
import type {AssessmentOutcome, ReviewRequestStatus} from "@/features/assessment/types";
import type {MeasurementSystem} from "@/features/questionnaire/units";

export type QuestionnaireData = {
  id: string;
  status: "DRAFT" | "SUBMITTED";
  currentStep: number;
  measurementSystem: MeasurementSystem;
  age: number | null;
  sexAssignedAtBirth: SexAssignedAtBirth | null;
  heightCm: number | null;
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  healthConditions: HealthCondition[];
  medications: string | null;
  noMedication: boolean;
  assessmentOutcome: AssessmentOutcome | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
};

export type AdminQuestionnaireSubmission = QuestionnaireData & {
  memberName: string;
  memberEmail: string;
  memberLanguage: "en" | "es";
  reportLanguage: "en" | "es";
  reviewRequestId: string;
  reviewStatus: ReviewRequestStatus;
  reviewRequestedAt: string;
  reviewUpdatedAt: string;
};
