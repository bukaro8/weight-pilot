import "server-only";

import {and, desc, eq, isNotNull} from "drizzle-orm";
import {z} from "zod";

import {getDb} from "@/db";
import {consultationReport, questionnaire, questionnaireReviewRequest, user} from "@/db/schema";
import {calculatePreliminaryAssessment} from "@/features/assessment/engine";
import {assessmentOutcomeSchema} from "@/features/assessment/validation";
import {publicInvitationOrigin} from "@/features/invitations/sharing";
import {serializeQuestionnaire} from "@/features/questionnaire/server";
import {renderGuidanceReportEmail} from "@/features/reports/email";
import {buildEmailSummary} from "@/features/reports/summary";

export type MemberReportListItem = {
  id: string;
  assessmentReference: string;
  deliveredAt: string;
  language: "en" | "es";
};

function assessmentReference(reportId: string, deliveredAt: Date) {
  const date = deliveredAt.toISOString().slice(0, 10).replaceAll("-", "");
  return `WP-${date}-${reportId.slice(0, 6).toUpperCase()}`;
}

export async function listMemberDeliveredReports(userId: string): Promise<MemberReportListItem[]> {
  const records = await getDb().select({
    id: consultationReport.id,
    deliveredAt: consultationReport.deliveredAt,
    language: consultationReport.language,
  }).from(consultationReport)
    .innerJoin(questionnaireReviewRequest, eq(consultationReport.reviewRequestId, questionnaireReviewRequest.id))
    .innerJoin(questionnaire, eq(questionnaireReviewRequest.questionnaireId, questionnaire.id))
    .where(and(
      eq(questionnaire.userId, userId),
      eq(questionnaireReviewRequest.requestedByUserId, userId),
      eq(questionnaire.status, "SUBMITTED"),
      eq(consultationReport.sendStatus, "DELIVERED"),
      isNotNull(consultationReport.deliveredAt),
    )).orderBy(desc(consultationReport.deliveredAt));

  return records.flatMap((record) => record.deliveredAt ? [{
    id: record.id,
    assessmentReference: assessmentReference(record.id, record.deliveredAt),
    deliveredAt: record.deliveredAt.toISOString(),
    language: record.language,
  }] : []);
}

export async function getMemberDeliveredReport(userId: string, reportId: string) {
  if (!z.uuid().safeParse(reportId).success) return null;
  const [record] = await getDb().select({
    report: consultationReport,
    questionnaire,
    memberName: user.name,
  }).from(consultationReport)
    .innerJoin(questionnaireReviewRequest, eq(consultationReport.reviewRequestId, questionnaireReviewRequest.id))
    .innerJoin(questionnaire, eq(questionnaireReviewRequest.questionnaireId, questionnaire.id))
    .innerJoin(user, eq(questionnaire.userId, user.id))
    .where(and(
      eq(consultationReport.id, reportId),
      eq(consultationReport.sendStatus, "DELIVERED"),
      isNotNull(consultationReport.deliveredAt),
      eq(questionnaireReviewRequest.requestedByUserId, userId),
      eq(questionnaire.userId, userId),
      eq(questionnaire.status, "SUBMITTED"),
    )).limit(1);
  if (!record?.report.deliveredAt) return null;

  const questionnaireData = serializeQuestionnaire(record.questionnaire);
  const parsedOutcome = assessmentOutcomeSchema.safeParse(questionnaireData.assessmentOutcome);
  const outcome = parsedOutcome.success ? parsedOutcome.data : calculatePreliminaryAssessment(questionnaireData);
  const origin = publicInvitationOrigin(process.env.PUBLIC_APP_URL || process.env.BETTER_AUTH_URL);
  const messagesUrl = origin ? new URL(`/${record.report.language}/messages`, origin).toString() : "";
  const email = renderGuidanceReportEmail({
    language: record.report.language,
    memberName: record.memberName,
    content: record.report.content,
    summary: buildEmailSummary(questionnaireData, outcome.bmi, outcome.targetWeightLossPercentage, record.report.language),
    savingsComparison: record.report.savingsComparisonEnabled ? record.report.savingsComparison : null,
    messagesUrl,
  });

  return {
    id: record.report.id,
    language: record.report.language,
    deliveredAt: record.report.deliveredAt.toISOString(),
    assessmentReference: assessmentReference(record.report.id, record.report.deliveredAt),
    emailHtml: email.html,
    savingsComparison: record.report.savingsComparisonEnabled ? record.report.savingsComparison : null,
  };
}
