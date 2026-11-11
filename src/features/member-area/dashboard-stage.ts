export type DashboardAssessment = {id: string; status: "DRAFT" | "SUBMITTED"; currentStep: number} | null;
export type DashboardReport = {id: string; questionnaireId: string; availableAt: string} | null;
export type DashboardTreatmentRequest = {
  id: string;
  reportId: string | null;
  status: "SUBMITTED" | "UNDER_REVIEW" | "APPROVED_FOR_NEXT_STEPS" | "DECLINED" | "CANCELLED";
} | null;

export type DashboardStage = "NEW" | "DRAFT" | "AWAITING_REVIEW_REQUEST" | "REVIEW" | "REPORT" | "REQUEST";

/** The most relevant outstanding step wins; an older report never masks a newer assessment. */
export function selectDashboardStage(input: {
  assessment: DashboardAssessment;
  reviewStatus: "REQUESTED" | "IN_REVIEW" | "COMPLETED" | null;
  report: DashboardReport;
  treatmentRequest: DashboardTreatmentRequest;
}): DashboardStage {
  const {assessment, reviewStatus, report, treatmentRequest} = input;
  if (!assessment) return "NEW";
  if (assessment.status === "DRAFT") return "DRAFT";
  if (!report || report.questionnaireId !== assessment.id) {
    return reviewStatus ? "REVIEW" : "AWAITING_REVIEW_REQUEST";
  }
  if (treatmentRequest?.reportId === report.id && treatmentRequest.status !== "CANCELLED") return "REQUEST";
  return "REPORT";
}
