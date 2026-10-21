import "server-only";

import {and, eq} from "drizzle-orm";

import {getDb} from "@/db";
import {consultationReport, questionnaire, questionnaireReviewRequest} from "@/db/schema";
import type {MemberReviewRequest, ReviewRequestStatus} from "@/features/assessment/types";

function serializeReviewRequest(record: typeof questionnaireReviewRequest.$inferSelect, reportId: string | null = null): MemberReviewRequest {
  return {
    id: record.id,
    reportLanguage: record.reportLanguage,
    status: record.status,
    reportId,
    requestedAt: record.requestedAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function getMemberReviewRequest(userId: string, questionnaireId: string) {
  const [record] = await getDb().select({review: questionnaireReviewRequest, reportId: consultationReport.id, sendStatus: consultationReport.sendStatus})
    .from(questionnaireReviewRequest)
    .innerJoin(questionnaire, eq(questionnaireReviewRequest.questionnaireId, questionnaire.id))
    .leftJoin(consultationReport, eq(consultationReport.reviewRequestId, questionnaireReviewRequest.id))
    .where(and(
      eq(questionnaireReviewRequest.questionnaireId, questionnaireId),
      eq(questionnaire.userId, userId),
      eq(questionnaire.status, "SUBMITTED"),
    )).limit(1);
  return record ? serializeReviewRequest(record.review, record.sendStatus === "DELIVERED" ? record.reportId : null) : null;
}

export async function requestPersonalisedReview(userId: string, questionnaireId: string, reportLanguage: "en" | "es") {
  return getDb().transaction(async (transaction) => {
    const [owned] = await transaction.select({id: questionnaire.id}).from(questionnaire).where(and(
      eq(questionnaire.id, questionnaireId),
      eq(questionnaire.userId, userId),
      eq(questionnaire.status, "SUBMITTED"),
    )).limit(1).for("update");
    if (!owned) return null;

    const inserted = await transaction.insert(questionnaireReviewRequest).values({questionnaireId, requestedByUserId: userId, reportLanguage})
      .onConflictDoNothing({target: questionnaireReviewRequest.questionnaireId}).returning({id: questionnaireReviewRequest.id});
    const [record] = await transaction.select().from(questionnaireReviewRequest)
      .where(and(
        eq(questionnaireReviewRequest.questionnaireId, questionnaireId),
        eq(questionnaireReviewRequest.requestedByUserId, userId),
      )).limit(1);
    return record ? {reviewRequest: serializeReviewRequest(record), created: inserted.length > 0} : null;
  });
}

export async function updateReviewRequestStatus(adminId: string, requestId: string, status: ReviewRequestStatus) {
  if (status === "COMPLETED") {
    const [report] = await getDb().select({status: consultationReport.sendStatus}).from(consultationReport)
      .where(and(eq(consultationReport.reviewRequestId, requestId), eq(consultationReport.sendStatus, "DELIVERED"))).limit(1);
    if (!report) return null;
  }
  const [updated] = await getDb().update(questionnaireReviewRequest).set({
    status, updatedAt: new Date(), updatedByAdminId: adminId,
  }).where(eq(questionnaireReviewRequest.id, requestId)).returning();
  return updated ? serializeReviewRequest(updated) : null;
}
