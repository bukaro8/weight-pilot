import "server-only";

import {and, desc, eq} from "drizzle-orm";

import {getDb} from "@/db";
import {questionnaire, questionnaireReviewRequest, treatmentAccessRequest} from "@/db/schema";
import {countMemberUnreadMessages} from "@/features/messages/server";
import {getMemberAvailableReport, listMemberAvailableReports} from "@/features/reports/member";
import {selectLatestMemberReport} from "@/features/member-area/report-state";
import {selectDashboardStage} from "@/features/member-area/dashboard-stage";

export async function getMemberDashboardOverview(userId: string) {
  const [latestQuestionnaire] = await getDb().select({
    id: questionnaire.id,
    status: questionnaire.status,
    currentStep: questionnaire.currentStep,
    updatedAt: questionnaire.updatedAt,
    submittedAt: questionnaire.submittedAt,
  }).from(questionnaire).where(eq(questionnaire.userId, userId))
    .orderBy(desc(questionnaire.updatedAt)).limit(1);

  let reviewStatus: "REQUESTED" | "IN_REVIEW" | "COMPLETED" | null = null;
  if (latestQuestionnaire?.status === "SUBMITTED") {
    const [review] = await getDb().select({status: questionnaireReviewRequest.status})
      .from(questionnaireReviewRequest)
      .where(and(
        eq(questionnaireReviewRequest.questionnaireId, latestQuestionnaire.id),
        eq(questionnaireReviewRequest.requestedByUserId, userId),
      )).limit(1);
    reviewStatus = review?.status ?? null;
  }

  const [reports, unreadMessages, latestTreatmentRequest] = await Promise.all([
    listMemberAvailableReports(userId),
    countMemberUnreadMessages(userId),
    getDb().select({id: treatmentAccessRequest.id, reportId: treatmentAccessRequest.reportId, status: treatmentAccessRequest.status})
      .from(treatmentAccessRequest).where(eq(treatmentAccessRequest.memberId, userId)).orderBy(desc(treatmentAccessRequest.createdAt)).limit(1).then((rows) => rows[0] ?? null),
  ]);
  const latestReport = selectLatestMemberReport(reports);
  const stage = selectDashboardStage({
    assessment: latestQuestionnaire ? {id: latestQuestionnaire.id, status: latestQuestionnaire.status, currentStep: latestQuestionnaire.currentStep} : null,
    reviewStatus,
    report: latestReport,
    treatmentRequest: latestTreatmentRequest,
  });
  const reportDetail = (stage === "REPORT" || stage === "REQUEST") && latestReport
    ? await getMemberAvailableReport(userId, latestReport.id) : null;

  return {
    stage,
    assessmentStatus: latestQuestionnaire?.status ?? "NONE",
    assessmentStep: latestQuestionnaire?.currentStep ?? null,
    assessmentUpdatedAt: latestQuestionnaire?.submittedAt?.toISOString() ?? latestQuestionnaire?.updatedAt.toISOString() ?? null,
    reviewStatus,
    latestReport,
    recommendedTreatment: reportDetail?.recommendedTreatment ?? null,
    latestTreatmentRequest,
    unreadMessages,
  };
}
