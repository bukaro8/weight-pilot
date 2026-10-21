import "server-only";

import {and, desc, eq} from "drizzle-orm";

import {getDb} from "@/db";
import {consultationReport, questionnaire, questionnaireReviewRequest} from "@/db/schema";
import {countMemberUnreadMessages} from "@/features/messages/server";
import {listMemberDeliveredReports} from "@/features/reports/member";

export async function getMemberDashboardOverview(userId: string) {
  const [latestQuestionnaire] = await getDb().select({
    id: questionnaire.id,
    status: questionnaire.status,
    updatedAt: questionnaire.updatedAt,
    submittedAt: questionnaire.submittedAt,
  }).from(questionnaire).where(eq(questionnaire.userId, userId))
    .orderBy(desc(questionnaire.updatedAt)).limit(1);

  let reviewStatus: "REQUESTED" | "IN_REVIEW" | "COMPLETED" | null = null;
  let assessmentReportAvailable = false;
  if (latestQuestionnaire?.status === "SUBMITTED") {
    const [review] = await getDb().select({status: questionnaireReviewRequest.status, sendStatus: consultationReport.sendStatus})
      .from(questionnaireReviewRequest)
      .leftJoin(consultationReport, eq(consultationReport.reviewRequestId, questionnaireReviewRequest.id))
      .where(and(
        eq(questionnaireReviewRequest.questionnaireId, latestQuestionnaire.id),
        eq(questionnaireReviewRequest.requestedByUserId, userId),
      )).limit(1);
    reviewStatus = review?.status ?? null;
    assessmentReportAvailable = review?.sendStatus === "DELIVERED";
  }

  const [reports, unreadMessages] = await Promise.all([
    listMemberDeliveredReports(userId),
    countMemberUnreadMessages(userId),
  ]);

  return {
    assessmentStatus: latestQuestionnaire?.status ?? "NONE",
    assessmentUpdatedAt: latestQuestionnaire?.submittedAt?.toISOString() ?? latestQuestionnaire?.updatedAt.toISOString() ?? null,
    reviewStatus,
    assessmentReportAvailable,
    latestReport: reports[0] ?? null,
    unreadMessages,
  };
}
