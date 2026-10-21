import "server-only";

import {and, desc, eq} from "drizzle-orm";

import {getDb} from "@/db";
import {questionnaire, questionnaireReviewRequest} from "@/db/schema";
import {countMemberUnreadMessages} from "@/features/messages/server";
import {listMemberAvailableReports} from "@/features/reports/member";
import {selectLatestMemberReport} from "@/features/member-area/report-state";

export async function getMemberDashboardOverview(userId: string) {
  const [latestQuestionnaire] = await getDb().select({
    id: questionnaire.id,
    status: questionnaire.status,
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

  const [reports, unreadMessages] = await Promise.all([
    listMemberAvailableReports(userId),
    countMemberUnreadMessages(userId),
  ]);

  return {
    assessmentStatus: latestQuestionnaire?.status ?? "NONE",
    assessmentUpdatedAt: latestQuestionnaire?.submittedAt?.toISOString() ?? latestQuestionnaire?.updatedAt.toISOString() ?? null,
    reviewStatus,
    latestReport: selectLatestMemberReport(reports),
    unreadMessages,
  };
}
