import type {AssessmentOutcome} from "@/features/assessment/types";
import type {QuestionnaireData} from "@/features/questionnaire/types";

export type ReportLanguage = "en" | "es";
export type ReportSendStatus = "DRAFT" | "SENDING" | "ACCEPTED" | "DELIVERED" | "FAILED";
export type ReportTreatment = "SEMAGLUTIDE" | "TIRZEPATIDE";
export type ReportReferenceScenario = {treatment: ReportTreatment; durationMonths: 6 | 12 | 16; deliveryMethod: "STANDARD_NEXT_DAY" | "GUARANTEED_NEXT_DAY"};
export type ReportReferenceEstimate = ReportReferenceScenario & {treatmentCostPence: number; deliveryCostPence: number; totalCostPence: number; pricingUpdatedAt: string};
export type ReportPharmacyEstimate = {referencePriceId?: string; treatment: ReportTreatment; strength?: string; amountPence: number; periodMonths: number; sourceName: string; sourceUrl: string; asOfDate: string};

export type ReportRecord = {
  id: string;
  language: ReportLanguage;
  content: string;
  referenceEstimate: ReportReferenceEstimate | null;
  pharmacyEstimate: ReportPharmacyEstimate | null;
  sendStatus: ReportSendStatus;
  providerMessageId: string | null;
  lastAttemptAt: string | null;
  acceptedAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  failureCode: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReportWorkspaceData = {
  reviewRequestId: string;
  reviewStatus: "REQUESTED" | "IN_REVIEW" | "COMPLETED";
  requestedAt: string;
  memberName: string;
  memberEmail: string;
  emailVerified: boolean;
  questionnaire: QuestionnaireData;
  assessment: AssessmentOutcome;
  pharmacyReferences: import("@/features/pricing/types").PharmacyReferenceData;
  referenceEstimate: ReportReferenceEstimate | null;
  pharmacyEstimate: ReportPharmacyEstimate | null;
  messagesUrl: string;
  report: ReportRecord;
  prompt: string;
  previewHtml: string;
};
