import "server-only";

import {and, count, eq, inArray, isNotNull, isNull, or} from "drizzle-orm";
import {getDb} from "@/db";
import {consultationReport, questionnaire, questionnaireReviewRequest, treatmentAccessRequest} from "@/db/schema";
import {countAdminUnreadMessages, countMemberUnreadMessages} from "@/features/messages/server";
import {emptyNavigationCounts, memberRequestUnreadStatuses, type NavigationCounts} from "./policy";

const availableReport = or(
  and(eq(consultationReport.sendStatus, "ACCEPTED"), isNotNull(consultationReport.providerMessageId), isNotNull(consultationReport.acceptedAt)),
  and(eq(consultationReport.sendStatus, "DELIVERED"), isNotNull(consultationReport.providerMessageId), isNotNull(consultationReport.deliveredAt)),
);

export async function getMemberNavigationCounts(memberId: string): Promise<NavigationCounts> {
  const [messages, [requests], [reports]] = await Promise.all([
    countMemberUnreadMessages(memberId),
    getDb().select({count: count()}).from(treatmentAccessRequest).where(and(
      eq(treatmentAccessRequest.memberId, memberId),
      inArray(treatmentAccessRequest.status, memberRequestUnreadStatuses),
      isNull(treatmentAccessRequest.memberViewedAt),
    )),
    getDb().select({count: count()}).from(consultationReport)
      .innerJoin(questionnaireReviewRequest, eq(consultationReport.reviewRequestId, questionnaireReviewRequest.id))
      .innerJoin(questionnaire, eq(questionnaireReviewRequest.questionnaireId, questionnaire.id))
      .where(and(eq(questionnaire.userId, memberId), eq(questionnaireReviewRequest.requestedByUserId, memberId), eq(questionnaire.status, "SUBMITTED"), isNull(consultationReport.memberViewedAt), availableReport)),
  ]);
  return {...emptyNavigationCounts, messages, requests: requests.count, reports: reports.count};
}

export async function getAdminNavigationCounts(adminId: string): Promise<NavigationCounts> {
  const [messages, [requests]] = await Promise.all([
    countAdminUnreadMessages(adminId),
    getDb().select({count: count()}).from(treatmentAccessRequest).where(and(
      eq(treatmentAccessRequest.status, "SUBMITTED"), isNull(treatmentAccessRequest.adminViewedAt),
    )),
  ]);
  return {...emptyNavigationCounts, messages, treatmentRequests: requests.count};
}

export async function markMemberReportViewed(memberId: string, reportId: string) {
  const [owned] = await getDb().select({id: consultationReport.id}).from(consultationReport)
    .innerJoin(questionnaireReviewRequest, eq(consultationReport.reviewRequestId, questionnaireReviewRequest.id))
    .innerJoin(questionnaire, eq(questionnaireReviewRequest.questionnaireId, questionnaire.id))
    .where(and(eq(consultationReport.id, reportId), eq(questionnaire.userId, memberId), eq(questionnaireReviewRequest.requestedByUserId, memberId), eq(questionnaire.status, "SUBMITTED"), availableReport)).limit(1);
  if (!owned) return false;
  await getDb().update(consultationReport).set({memberViewedAt: new Date()}).where(and(eq(consultationReport.id, reportId), isNull(consultationReport.memberViewedAt)));
  return true;
}

export async function markMemberRequestViewed(memberId: string, requestId: string, expectedStatus: "SUBMITTED" | "UNDER_REVIEW" | "APPROVED_FOR_NEXT_STEPS" | "DECLINED" | "CANCELLED") {
  const [updated] = await getDb().update(treatmentAccessRequest).set({memberViewedAt: new Date()}).where(and(
    eq(treatmentAccessRequest.id, requestId), eq(treatmentAccessRequest.memberId, memberId), isNull(treatmentAccessRequest.memberViewedAt),
    eq(treatmentAccessRequest.status, expectedStatus),
    inArray(treatmentAccessRequest.status, memberRequestUnreadStatuses),
  )).returning({id: treatmentAccessRequest.id});
  if (updated) return true;
  const [owned] = await getDb().select({id: treatmentAccessRequest.id}).from(treatmentAccessRequest).where(and(eq(treatmentAccessRequest.id, requestId), eq(treatmentAccessRequest.memberId, memberId))).limit(1);
  return Boolean(owned);
}

export async function markAdminRequestViewed(requestId: string) {
  const [updated] = await getDb().update(treatmentAccessRequest).set({adminViewedAt: new Date()}).where(and(eq(treatmentAccessRequest.id, requestId), isNull(treatmentAccessRequest.adminViewedAt))).returning({id: treatmentAccessRequest.id});
  if (updated) return true;
  const [exists] = await getDb().select({id: treatmentAccessRequest.id}).from(treatmentAccessRequest).where(eq(treatmentAccessRequest.id, requestId)).limit(1);
  return Boolean(exists);
}
