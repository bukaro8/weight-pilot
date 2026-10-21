type AvailableReport = {id: string; availableAt: string; assessmentReference: string; language: "en" | "es"};

export type MemberReviewState = "REQUESTED" | "IN_REVIEW" | "COMPLETED" | null;
export type MemberReportCardState = "READY" | "REQUESTED" | "IN_REVIEW" | null;

export function isMemberReportVisible(report: {
  sendStatus: "DRAFT" | "SENDING" | "ACCEPTED" | "DELIVERED" | "FAILED" | null;
  providerMessageId: string | null;
  acceptedAt: string | Date | null;
  deliveredAt: string | Date | null;
}) {
  const hasProviderMessage = Boolean(report.providerMessageId);
  if (report.sendStatus === "ACCEPTED") return hasProviderMessage && Boolean(report.acceptedAt);
  if (report.sendStatus === "DELIVERED") return hasProviderMessage && Boolean(report.deliveredAt);
  return false;
}

export function selectLatestMemberReport<T extends AvailableReport>(reports: readonly T[]) {
  return [...reports].sort((first, second) => Date.parse(second.availableAt) - Date.parse(first.availableAt))[0] ?? null;
}

/** A confirmed Resend submission is authoritative; review status only supplies pending copy. */
export function getMemberReportCardState(hasAvailableReport: boolean, reviewStatus: MemberReviewState): MemberReportCardState {
  if (hasAvailableReport) return "READY";
  if (reviewStatus === "REQUESTED" || reviewStatus === "IN_REVIEW") return reviewStatus;
  return null;
}
