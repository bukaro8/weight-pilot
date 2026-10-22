import "server-only";

import {and, desc, eq, isNotNull, or, sql} from "drizzle-orm";
import {z} from "zod";

import {getDb} from "@/db";
import {consultationReport, questionnaire, questionnaireReviewRequest, user} from "@/db/schema";
import {calculatePreliminaryAssessment} from "@/features/assessment/engine";
import {assessmentOutcomeSchema} from "@/features/assessment/validation";
import {publicInvitationOrigin} from "@/features/invitations/sharing";
import {serializeQuestionnaire} from "@/features/questionnaire/server";
import {renderGuidanceReportEmail} from "@/features/reports/email";
import {getClearTreatmentSuggestion} from "@/features/reports/content";
import {buildEmailSummary} from "@/features/reports/summary";
import {isMemberReportVisible} from "@/features/member-area/report-state";

export type MemberReportListItem = {
  id: string;
  assessmentReference: string;
  availableAt: string;
  language: "en" | "es";
};

function assessmentReference(reportId: string, availableAt: Date) {
  const date = availableAt.toISOString().slice(0, 10).replaceAll("-", "");
  return `WP-${date}-${reportId.slice(0, 6).toUpperCase()}`;
}

export async function listMemberAvailableReports(userId: string): Promise<MemberReportListItem[]> {
  const records = await getDb().select({
    id: consultationReport.id,
    sendStatus: consultationReport.sendStatus,
    providerMessageId: consultationReport.providerMessageId,
    acceptedAt: consultationReport.acceptedAt,
    deliveredAt: consultationReport.deliveredAt,
    language: consultationReport.language,
  }).from(consultationReport)
    .innerJoin(questionnaireReviewRequest, eq(consultationReport.reviewRequestId, questionnaireReviewRequest.id))
    .innerJoin(questionnaire, eq(questionnaireReviewRequest.questionnaireId, questionnaire.id))
    .where(and(
      eq(questionnaire.userId, userId),
      eq(questionnaireReviewRequest.requestedByUserId, userId),
      eq(questionnaire.status, "SUBMITTED"),
      or(
        and(eq(consultationReport.sendStatus, "ACCEPTED"), isNotNull(consultationReport.providerMessageId), isNotNull(consultationReport.acceptedAt)),
        and(eq(consultationReport.sendStatus, "DELIVERED"), isNotNull(consultationReport.providerMessageId), isNotNull(consultationReport.deliveredAt)),
      ),
    )).orderBy(desc(sql`coalesce(${consultationReport.deliveredAt}, ${consultationReport.acceptedAt})`));

  return records.flatMap((record) => {
    const availableAt = record.deliveredAt ?? record.acceptedAt;
    if (!availableAt || !isMemberReportVisible({...record, acceptedAt: record.acceptedAt, deliveredAt: record.deliveredAt})) return [];
    return [{
      id: record.id,
      assessmentReference: assessmentReference(record.id, availableAt),
      availableAt: availableAt.toISOString(),
      language: record.language,
    }];
  });
}

export async function getMemberAvailableReport(userId: string, reportId: string) {
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
      or(
        and(eq(consultationReport.sendStatus, "ACCEPTED"), isNotNull(consultationReport.providerMessageId), isNotNull(consultationReport.acceptedAt)),
        and(eq(consultationReport.sendStatus, "DELIVERED"), isNotNull(consultationReport.providerMessageId), isNotNull(consultationReport.deliveredAt)),
      ),
      eq(questionnaireReviewRequest.requestedByUserId, userId),
      eq(questionnaire.userId, userId),
      eq(questionnaire.status, "SUBMITTED"),
    )).limit(1);
  if (!record || !isMemberReportVisible({...record.report, acceptedAt: record.report.acceptedAt, deliveredAt: record.report.deliveredAt})) return null;
  const availableAt = record.report.deliveredAt ?? record.report.acceptedAt;
  if (!availableAt) return null;

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
    availableAt: availableAt.toISOString(),
    assessmentReference: assessmentReference(record.report.id, availableAt),
    emailHtml: email.html,
    recommendedTreatment: getClearTreatmentSuggestion(record.report.content),
    savingsComparison: record.report.savingsComparisonEnabled ? record.report.savingsComparison : null,
  };
}
