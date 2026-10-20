import type {AssessmentOutcome} from "@/features/assessment/types";
import type {QuestionnaireData} from "@/features/questionnaire/types";

export type ReportLanguage = "en" | "es";
export type ReportSendStatus = "DRAFT" | "SENDING" | "ACCEPTED" | "DELIVERED" | "FAILED";

export type ReportRecord = {
  id: string;
  language: ReportLanguage;
  content: string;
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
  report: ReportRecord;
  prompt: string;
  previewHtml: string;
};
