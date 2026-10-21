import "server-only";

import {and, eq, isNull} from "drizzle-orm";

import {getDb} from "@/db";
import {consultationReport, questionnaire, questionnaireReviewRequest, reportDeliveryAttempt, user} from "@/db/schema";
import {assessmentOutcomeSchema} from "@/features/assessment/validation";
import {calculatePreliminaryAssessment} from "@/features/assessment/engine";
import {serializeQuestionnaire} from "@/features/questionnaire/server";
import {normalizeReportContent} from "@/features/reports/content";
import {deliverGuidanceReport, renderGuidanceReportEmail, sendReviewRequestNotification} from "@/features/reports/email";
import {ReportSettlementError, settleReportSend} from "@/features/reports/send-finalization";
import {generateAiResearchPrompt} from "@/features/reports/prompt";
import {parseReportAssessment} from "@/features/reports/validation";
import {buildSavingsComparison, getMissingPharmacyReferenceStrengths, resolveComparisonTreatment, type SavingsComparisonSnapshot} from "@/features/reports/savings-comparison";
import {getPharmacyReferenceData, getTreatmentPricing, PricingConfigurationError} from "@/features/pricing/server";
import type {PharmacyReferenceData} from "@/features/pricing/types";
import {publicInvitationOrigin} from "@/features/invitations/sharing";
import type {ReportLanguage, ReportRecord, ReportWorkspaceData} from "@/features/reports/types";

const conditionEmailLabels: Record<string, Record<ReportLanguage, string>> = {
  DIABETES: {en: "Diabetes", es: "Diabetes"}, HIGH_BLOOD_PRESSURE: {en: "High blood pressure", es: "Tensión arterial alta"},
  HEART_CONDITIONS: {en: "Heart conditions", es: "Afecciones cardíacas"}, KIDNEY_OR_LIVER_DISEASE: {en: "Kidney or liver disease", es: "Enfermedad renal o hepática"},
  PANCREATITIS_OR_GALLBLADDER: {en: "Pancreatitis or gallbladder problems", es: "Pancreatitis o problemas de vesícula"}, SERIOUS_DIGESTIVE_PROBLEMS: {en: "Serious digestive problems", es: "Problemas digestivos graves"},
  DIABETIC_EYE_DISEASE: {en: "Diabetic eye disease", es: "Enfermedad ocular diabética"}, PREGNANCY: {en: "Pregnancy, breastfeeding or pregnancy plans", es: "Embarazo, lactancia o planes de embarazo"},
  OTHER: {en: "Other health conditions", es: "Otras afecciones de salud"}, NOT_SURE: {en: "Not sure", es: "No está claro"},
};

function buildEmailSummary(questionnaireData: ReturnType<typeof serializeQuestionnaire>, bmi: number | null, targetLossPercentage: number | null, language: ReportLanguage) {
  return {
    currentWeightKg: questionnaireData.currentWeightKg, targetWeightKg: questionnaireData.targetWeightKg, bmi, targetLossPercentage,
    healthConsiderations: questionnaireData.healthConditions.filter((condition) => condition !== "NONE").map((condition) => conditionEmailLabels[condition]?.[language] ?? condition),
    medicationStatus: questionnaireData.noMedication ? "NONE_REPORTED" as const : questionnaireData.medications?.trim() ? "REPORTED" as const : "UNCLEAR" as const,
  };
}

export class ReportError extends Error {
  constructor(public readonly code: "REPORT_NOT_FOUND" | "REPORT_LOCKED" | "REPORT_EMPTY" | "REPORT_INVALID_CONTENT" | "REPORT_ALREADY_SENT" | "RECIPIENT_UNVERIFIED" | "REPORT_PROVIDER_REJECTED" | "REPORT_EMAIL_NOT_CONFIGURED" | "REPORT_SEND_UNCERTAIN" | "REPORT_ACCEPTANCE_UNRECORDED" | "REPORT_DATABASE_FAILED" | "REPORT_PUBLIC_URL_NOT_CONFIGURED" | "REPORT_INVALID_PHARMACY" | "COMPARISON_PRICES_MISSING") { super(code); }
}

async function getReportPharmacyReferences(): Promise<PharmacyReferenceData> {
  try {
    return await getPharmacyReferenceData();
  } catch (error) {
    if (!(error instanceof PricingConfigurationError)) throw error;
    return {source: {id: "", name: "Boots Online Doctor", url: "", referenceDate: "", updatedAt: ""}, prices: []};
  }
}

function serializeReport(record: typeof consultationReport.$inferSelect): ReportRecord {
  return {
    id: record.id, language: record.language, content: record.content,
    referenceEstimate: record.referenceEstimate, pharmacyEstimate: record.pharmacyEstimate,
    savingsComparison: record.savingsComparison, savingsComparisonEnabled: record.savingsComparisonEnabled,
    sendStatus: record.sendStatus,
    providerMessageId: record.providerMessageId, lastAttemptAt: record.lastAttemptAt?.toISOString() ?? null,
    acceptedAt: record.acceptedAt?.toISOString() ?? null, deliveredAt: record.deliveredAt?.toISOString() ?? null,
    failedAt: record.failedAt?.toISOString() ?? null, failureCode: record.failureCode,
    createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(),
  };
}

async function ensureReport(reviewRequestId: string) {
  const database = getDb();
  const [owner] = await database.select({language: questionnaireReviewRequest.reportLanguage})
    .from(questionnaireReviewRequest)
    .innerJoin(user, eq(questionnaireReviewRequest.requestedByUserId, user.id))
    .where(eq(questionnaireReviewRequest.id, reviewRequestId)).limit(1);
  if (!owner) throw new ReportError("REPORT_NOT_FOUND");
  await database.insert(consultationReport).values({reviewRequestId, language: owner.language}).onConflictDoNothing({target: consultationReport.reviewRequestId});
}

export async function getReportWorkspace(reviewRequestId: string, promptLanguage?: ReportLanguage): Promise<ReportWorkspaceData> {
  await ensureReport(reviewRequestId);
  const [record] = await getDb().select({
    review: questionnaireReviewRequest, questionnaire, report: consultationReport,
    memberName: user.name, memberEmail: user.email, emailVerified: user.emailVerified,
  }).from(questionnaireReviewRequest)
    .innerJoin(questionnaire, eq(questionnaireReviewRequest.questionnaireId, questionnaire.id))
    .innerJoin(user, eq(questionnaireReviewRequest.requestedByUserId, user.id))
    .innerJoin(consultationReport, eq(consultationReport.reviewRequestId, questionnaireReviewRequest.id))
    .where(and(eq(questionnaireReviewRequest.id, reviewRequestId), eq(questionnaire.status, "SUBMITTED"))).limit(1);
  if (!record) throw new ReportError("REPORT_NOT_FOUND");
  const questionnaireData = serializeQuestionnaire(record.questionnaire);
  const parsedAssessment = assessmentOutcomeSchema.safeParse(questionnaireData.assessmentOutcome);
  const assessment = parsedAssessment.success ? parsedAssessment.data : calculatePreliminaryAssessment(questionnaireData);
  if (!parsedAssessment.success) {
    await getDb().update(questionnaire).set({assessmentOutcome: assessment, assessmentVersion: assessment.engineVersion, updatedAt: new Date()})
      .where(eq(questionnaire.id, questionnaireData.id));
    questionnaireData.assessmentOutcome = assessment;
  }
  const report = serializeReport(record.report);
  const pharmacyReferences = await getReportPharmacyReferences();
  const origin = publicInvitationOrigin(process.env.PUBLIC_APP_URL || process.env.BETTER_AUTH_URL);
  const messagesUrl = origin ? new URL(`/${report.language}/messages`, origin).toString() : "";
  const emailExtras = {
    summary: buildEmailSummary(questionnaireData, assessment.bmi, assessment.targetWeightLossPercentage, report.language),
    // The automatic comparison is the single like-for-like comparison in the email.
    // Keep older estimates on the report record, but do not display overlapping figures.
    referenceEstimate: null,
    pharmacyEstimate: null,
    savingsComparison: report.savingsComparisonEnabled ? report.savingsComparison : null,
    messagesUrl,
  };
  return {
    reviewRequestId: record.review.id, reviewStatus: record.review.status,
    requestedAt: record.review.requestedAt.toISOString(), memberName: record.memberName,
    memberEmail: record.memberEmail, emailVerified: record.emailVerified,
    questionnaire: questionnaireData, assessment, report,
    pharmacyReferences,
    referenceEstimate: report.referenceEstimate, pharmacyEstimate: report.pharmacyEstimate, messagesUrl,
    prompt: generateAiResearchPrompt({questionnaire: questionnaireData, assessment, language: promptLanguage ?? report.language, identityValues: [record.memberName, record.memberEmail]}),
    previewHtml: renderGuidanceReportEmail({language: report.language, memberName: record.memberName, content: report.content, ...emailExtras}).html,
  };
}

export async function saveReportDraft(adminId: string, reviewRequestId: string, input: {
  language: ReportLanguage;
  content: string;
  includeSavingsComparison: boolean;
}) {
  await ensureReport(reviewRequestId);
  const content = normalizeReportContent(input.content);
  const parsed = parseReportAssessment(content);
  if (!parsed.success) throw new ReportError("REPORT_INVALID_CONTENT");
  const comparisonTreatment = resolveComparisonTreatment(parsed.data.recommendedTreatment, null);
  const comparisonEnabled = input.includeSavingsComparison && comparisonTreatment !== null;
  let savingsComparison: SavingsComparisonSnapshot | null = null;
  if (comparisonEnabled) {
    const pharmacy = await getReportPharmacyReferences();
    if (!pharmacy.source.url || !pharmacy.source.referenceDate || getMissingPharmacyReferenceStrengths(comparisonTreatment, pharmacy).length) {
      throw new ReportError("COMPARISON_PRICES_MISSING");
    }
    const pricing = await getTreatmentPricing();
    savingsComparison = buildSavingsComparison({treatment: comparisonTreatment, hypothetical: false, pricing, pharmacy});
    if (!savingsComparison) throw new ReportError("COMPARISON_PRICES_MISSING");
  }
  const [updated] = await getDb().update(consultationReport).set({
    language: input.language, content,
    ...(comparisonEnabled ? {savingsComparison} : {}),
    savingsComparisonEnabled: comparisonEnabled,
    updatedAt: new Date(), updatedByAdminId: adminId,
  }).where(and(
    eq(consultationReport.reviewRequestId, reviewRequestId),
    eq(consultationReport.sendStatus, "DRAFT"),
  )).returning();
  if (!updated) {
    const [existing] = await getDb().select({status: consultationReport.sendStatus}).from(consultationReport).where(eq(consultationReport.reviewRequestId, reviewRequestId)).limit(1);
    if (existing?.status === "FAILED") {
      const [retried] = await getDb().update(consultationReport).set({language: input.language, content, ...(comparisonEnabled ? {savingsComparison} : {}), savingsComparisonEnabled: comparisonEnabled, sendStatus: "DRAFT", failureCode: null, failedAt: null, updatedAt: new Date(), updatedByAdminId: adminId}).where(and(eq(consultationReport.reviewRequestId, reviewRequestId), eq(consultationReport.sendStatus, "FAILED"), isNull(consultationReport.providerMessageId))).returning();
      if (retried) return serializeReport(retried);
    }
    throw new ReportError("REPORT_LOCKED");
  }
  return serializeReport(updated);
}

export async function sendReport(adminId: string, reviewRequestId: string) {
  const database = getDb();
  const origin = publicInvitationOrigin(process.env.PUBLIC_APP_URL || process.env.BETTER_AUTH_URL);
  if (!origin) throw new ReportError("REPORT_PUBLIC_URL_NOT_CONFIGURED");
  const prepared = await database.transaction(async (transaction) => {
    const [record] = await transaction.select({report: consultationReport, memberName: user.name, memberEmail: user.email, emailVerified: user.emailVerified, questionnaire})
      .from(consultationReport)
      .innerJoin(questionnaireReviewRequest, eq(consultationReport.reviewRequestId, questionnaireReviewRequest.id))
      .innerJoin(questionnaire, eq(questionnaireReviewRequest.questionnaireId, questionnaire.id))
      .innerJoin(user, eq(questionnaireReviewRequest.requestedByUserId, user.id))
      .where(eq(consultationReport.reviewRequestId, reviewRequestId)).limit(1).for("update");
    if (!record) throw new ReportError("REPORT_NOT_FOUND");
    if (!record.emailVerified) throw new ReportError("RECIPIENT_UNVERIFIED");
    if (!normalizeReportContent(record.report.content)) throw new ReportError("REPORT_EMPTY");
    if (!parseReportAssessment(record.report.content).success) throw new ReportError("REPORT_INVALID_CONTENT");
    if (record.report.savingsComparisonEnabled && !record.report.savingsComparison) throw new ReportError("COMPARISON_PRICES_MISSING");
    if (record.report.providerMessageId || ["ACCEPTED", "DELIVERED", "SENDING"].includes(record.report.sendStatus)) throw new ReportError("REPORT_ALREADY_SENT");
    const now = new Date();
    const [locked] = await transaction.update(consultationReport).set({sendStatus: "SENDING", lastAttemptAt: now, failureCode: null, failedAt: null, updatedAt: now, sentByAdminId: adminId})
      .where(and(eq(consultationReport.id, record.report.id), eq(consultationReport.sendStatus, record.report.sendStatus))).returning();
    if (!locked) throw new ReportError("REPORT_ALREADY_SENT");
    return {report: locked, memberName: record.memberName, memberEmail: record.memberEmail, questionnaire: record.questionnaire};
  }).catch((error: unknown) => {
    if (error instanceof ReportError) throw error;
    console.error("Report send preparation failed", {stage: "database", code: databaseErrorCode(error)});
    throw new ReportError("REPORT_DATABASE_FAILED");
  });

  const messagesUrl = new URL(`/${prepared.report.language}/messages`, origin).toString();
  const questionnaireData = serializeQuestionnaire(prepared.questionnaire);
  const assessment = assessmentOutcomeSchema.safeParse(questionnaireData.assessmentOutcome);
  const outcome = assessment.success ? assessment.data : calculatePreliminaryAssessment(questionnaireData);

  const delivery = await deliverGuidanceReport({
    reportId: prepared.report.id, language: prepared.report.language, memberName: prepared.memberName,
    recipient: prepared.memberEmail, content: prepared.report.content,
    summary: buildEmailSummary(questionnaireData, outcome.bmi, outcome.targetWeightLossPercentage, prepared.report.language),
    // Legacy estimates remain stored on the report, but new report emails use only the unified comparison.
    referenceEstimate: null,
    pharmacyEstimate: null,
    savingsComparison: prepared.report.savingsComparisonEnabled ? prepared.report.savingsComparison : null,
    messagesUrl,
  });
  const now = new Date();
  let accepted: typeof consultationReport.$inferSelect;
  try {
    accepted = await settleReportSend(delivery, {
      recordAccepted: async (providerMessageId) => database.transaction(async (transaction) => {
        const [updated] = await transaction.update(consultationReport).set({sendStatus: "ACCEPTED", providerMessageId, acceptedAt: now, updatedAt: now})
          .where(and(eq(consultationReport.id, prepared.report.id), eq(consultationReport.sendStatus, "SENDING"))).returning();
        if (!updated) throw new Error("REPORT_STATUS_CHANGED");
        await transaction.insert(reportDeliveryAttempt).values({reportId: prepared.report.id, status: "ACCEPTED", providerMessageId, attemptedAt: now, adminId});
        await transaction.update(questionnaireReviewRequest).set({status: "IN_REVIEW", updatedAt: now, updatedByAdminId: adminId})
          .where(and(eq(questionnaireReviewRequest.id, reviewRequestId), eq(questionnaireReviewRequest.status, "REQUESTED")));
        return updated;
      }),
      recordRejected: async (failureCode) => database.transaction(async (transaction) => {
        const [failed] = await transaction.update(consultationReport).set({sendStatus: "FAILED", failureCode, failedAt: now, updatedAt: now})
          .where(and(eq(consultationReport.id, prepared.report.id), eq(consultationReport.sendStatus, "SENDING"))).returning();
        if (!failed) throw new Error("REPORT_STATUS_CHANGED");
        await transaction.insert(reportDeliveryAttempt).values({reportId: prepared.report.id, status: "FAILED", failureCode, attemptedAt: now, adminId});
      }),
      recordUncertain: async (failureCode) => { await database.update(consultationReport).set({failureCode, updatedAt: now})
        .where(and(eq(consultationReport.id, prepared.report.id), eq(consultationReport.sendStatus, "SENDING"))); },
      onPersistenceError: (stage, error) => console.error("Report send state could not be recorded", {stage, code: databaseErrorCode(error)}),
    });
  } catch (error) {
    if (!(error instanceof ReportSettlementError)) throw error;
    throw new ReportError(error.code === "PROVIDER_REJECTED" ? "REPORT_PROVIDER_REJECTED"
      : error.code === "EMAIL_NOT_CONFIGURED" ? "REPORT_EMAIL_NOT_CONFIGURED"
      : error.code === "ACCEPTANCE_UNRECORDED" ? "REPORT_ACCEPTANCE_UNRECORDED" : "REPORT_SEND_UNCERTAIN");
  }
  return serializeReport(accepted);
}

function databaseErrorCode(error: unknown): string | undefined {
  const cause = error && typeof error === "object" && "cause" in error ? error.cause : error;
  return cause && typeof cause === "object" && "code" in cause && typeof cause.code === "string" ? cause.code : undefined;
}

export async function applyResendDeliveryEvent(input: {type: string; providerMessageId: string}) {
  const failureCodes: Record<string, string> = {"email.failed": "PROVIDER_FAILED", "email.bounced": "PROVIDER_BOUNCED", "email.suppressed": "PROVIDER_SUPPRESSED", "email.complained": "PROVIDER_COMPLAINT"};
  return getDb().transaction(async (transaction) => {
    const [record] = await transaction.select().from(consultationReport).where(eq(consultationReport.providerMessageId, input.providerMessageId)).limit(1).for("update");
    if (!record) return false;
    const now = new Date();
    if (input.type === "email.delivered" && record.sendStatus !== "DELIVERED") {
      await transaction.update(consultationReport).set({sendStatus: "DELIVERED", deliveredAt: now, failedAt: null, failureCode: null, updatedAt: now}).where(eq(consultationReport.id, record.id));
      await transaction.update(questionnaireReviewRequest).set({status: "COMPLETED", updatedAt: now, updatedByAdminId: record.sentByAdminId}).where(eq(questionnaireReviewRequest.id, record.reviewRequestId));
    } else if (failureCodes[input.type] && record.sendStatus !== "DELIVERED") {
      await transaction.update(consultationReport).set({sendStatus: "FAILED", failedAt: now, failureCode: failureCodes[input.type], updatedAt: now}).where(eq(consultationReport.id, record.id));
      await transaction.update(questionnaireReviewRequest).set({status: "IN_REVIEW", updatedAt: now}).where(eq(questionnaireReviewRequest.id, record.reviewRequestId));
    }
    return true;
  });
}

export async function notifyAdminOfReviewRequest(reviewRequestId: string) {
  const [admin] = await getDb().select({email: user.email, language: user.preferredLanguage})
    .from(user).where(and(eq(user.role, "ADMIN"), eq(user.status, "ACTIVE"), eq(user.emailVerified, true))).limit(1);
  const baseUrl = process.env.BETTER_AUTH_URL;
  if (!admin || !baseUrl) return;
  const dashboardUrl = new URL(`/${admin.language}/admin/questionnaires/${reviewRequestId}`, baseUrl).toString();
  await sendReviewRequestNotification({recipient: admin.email, language: admin.language, dashboardUrl, requestId: reviewRequestId});
}
