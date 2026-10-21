type DeliveredReport = {id: string; deliveredAt: string; assessmentReference: string; language: "en" | "es"};

export type MemberReviewState = "REQUESTED" | "IN_REVIEW" | "COMPLETED" | null;
export type MemberReportCardState = "READY" | "REQUESTED" | "IN_REVIEW" | null;

export function selectLatestDeliveredReport<T extends DeliveredReport>(reports: readonly T[]) {
  return [...reports].sort((first, second) => Date.parse(second.deliveredAt) - Date.parse(first.deliveredAt))[0] ?? null;
}

/** A delivered report record is authoritative; review status is only used for pending copy. */
export function getMemberReportCardState(hasDeliveredReport: boolean, reviewStatus: MemberReviewState): MemberReportCardState {
  if (hasDeliveredReport) return "READY";
  if (reviewStatus === "REQUESTED" || reviewStatus === "IN_REVIEW") return reviewStatus;
  return null;
}
