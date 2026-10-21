import "server-only";

import {and, eq} from "drizzle-orm";

import {getDb} from "@/db";
import {consultationReport, pharmacyReferencePrice, pharmacyReferenceSource, questionnaire, questionnaireReviewRequest, reportDeliveryAttempt, user} from "@/db/schema";
import {assessmentOutcomeSchema} from "@/features/assessment/validation";
import {calculatePreliminaryAssessment} from "@/features/assessment/engine";
import {serializeQuestionnaire} from "@/features/questionnaire/server";
import {normalizeReportContent} from "@/features/reports/content";
import {deliverGuidanceReport, renderGuidanceReportEmail, sendReviewRequestNotification} from "@/features/reports/email";
import {generateAiResearchPrompt} from "@/features/reports/prompt";
import {calculateReferenceCost} from "@/features/pricing/calculations";
import {getPharmacyReferenceData, getPricingBook} from "@/features/pricing/server";
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
  constructor(public readonly code: "REPORT_NOT_FOUND" | "REPORT_LOCKED" | "REPORT_EMPTY" | "REPORT_ALREADY_SENT" | "RECIPIENT_UNVERIFIED" | "REPORT_SEND_FAILED" | "REPORT_PUBLIC_URL_NOT_CONFIGURED" | "REPORT_INVALID_PHARMACY") { super(code); }
}

function serializeReport(record: typeof consultationReport.$inferSelect): ReportRecord {
  return {
    id: record.id, language: record.language, content: record.content,
    referenceEstimate: record.referenceEstimate, pharmacyEstimate: record.pharmacyEstimate,
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

export async function getReportWorkspace(reviewRequestId: string): Promise<ReportWorkspaceData> {
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
  const pharmacyReferences = await getPharmacyReferenceData();
  const origin = publicInvitationOrigin(process.env.PUBLIC_APP_URL || process.env.BETTER_AUTH_URL);
  const messagesUrl = origin ? new URL(`/${report.language}/messages`, origin).toString() : "";
  const emailExtras = {
    summary: buildEmailSummary(questionnaireData, assessment.bmi, assessment.targetWeightLossPercentage, report.language),
    referenceEstimate: report.referenceEstimate,
    pharmacyEstimate: report.referenceEstimate ? null : report.pharmacyEstimate,
    messagesUrl,
  };
  return {
    reviewRequestId: record.review.id, reviewStatus: record.review.status,
    requestedAt: record.review.requestedAt.toISOString(), memberName: record.memberName,
    memberEmail: record.memberEmail, emailVerified: record.emailVerified,
    questionnaire: questionnaireData, assessment, report,
    pharmacyReferences,
    referenceEstimate: report.referenceEstimate, pharmacyEstimate: report.pharmacyEstimate, messagesUrl,
    prompt: generateAiResearchPrompt({questionnaire: questionnaireData, assessment, language: report.language, identityValues: [record.memberName, record.memberEmail]}),
    previewHtml: renderGuidanceReportEmail({language: report.language, memberName: record.memberName, content: report.content, ...emailExtras}).html,
  };
}

export async function saveReportDraft(adminId: string, reviewRequestId: string, input: {
  language: ReportLanguage;
  content: string;
  referenceScenario: {treatment: "SEMAGLUTIDE" | "TIRZEPATIDE"; durationMonths: 6 | 12 | 16; deliveryMethod: "STANDARD_NEXT_DAY" | "GUARANTEED_NEXT_DAY"} | null;
  pharmacyReferencePriceId: string | null;
  preserveExistingPharmacyEstimate: boolean;
}) {
  await ensureReport(reviewRequestId);
  const content = normalizeReportContent(input.content);
  const pricing = input.referenceScenario ? await getPricingBook() : null;
  const referenceEstimate = input.referenceScenario && pricing ? {
    ...calculateReferenceCost(pricing, input.referenceScenario.treatment, input.referenceScenario.deliveryMethod, input.referenceScenario.durationMonths),
    pricingUpdatedAt: pricing.updatedAt,
  } : null;
  let pharmacyEstimate = null;
  if (input.pharmacyReferencePriceId) {
    if (input.referenceScenario) throw new ReportError("REPORT_INVALID_PHARMACY");
    const [reference] = await getDb().select({price: pharmacyReferencePrice, source: pharmacyReferenceSource})
      .from(pharmacyReferencePrice).innerJoin(pharmacyReferenceSource, eq(pharmacyReferencePrice.sourceId, pharmacyReferenceSource.id))
      .where(eq(pharmacyReferencePrice.id, input.pharmacyReferencePriceId)).limit(1);
    if (!reference) throw new ReportError("REPORT_INVALID_PHARMACY");
    pharmacyEstimate = {
      referencePriceId: reference.price.id, treatment: reference.price.treatment, strength: reference.price.strength,
      amountPence: reference.price.pricePence, periodMonths: reference.price.periodMonths,
      sourceName: reference.source.name, sourceUrl: reference.source.url, asOfDate: reference.source.referenceDate,
    };
  } else if (input.preserveExistingPharmacyEstimate) {
    const [existing] = await getDb().select({pharmacyEstimate: consultationReport.pharmacyEstimate}).from(consultationReport).where(eq(consultationReport.reviewRequestId, reviewRequestId)).limit(1);
    pharmacyEstimate = existing?.pharmacyEstimate ?? null;
  }
  const [updated] = await getDb().update(consultationReport).set({
    language: input.language, content, referenceEstimate, pharmacyEstimate,
    updatedAt: new Date(), updatedByAdminId: adminId,
  }).where(and(
    eq(consultationReport.reviewRequestId, reviewRequestId),
    eq(consultationReport.sendStatus, "DRAFT"),
  )).returning();
  if (!updated) {
    const [existing] = await getDb().select({status: consultationReport.sendStatus}).from(consultationReport).where(eq(consultationReport.reviewRequestId, reviewRequestId)).limit(1);
    if (existing?.status === "FAILED") {
      const [retried] = await getDb().update(consultationReport).set({language: input.language, content, referenceEstimate, pharmacyEstimate, sendStatus: "DRAFT", failureCode: null, failedAt: null, updatedAt: new Date(), updatedByAdminId: adminId}).where(and(eq(consultationReport.reviewRequestId, reviewRequestId), eq(consultationReport.sendStatus, "FAILED"))).returning();
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
      .innerJoin(user, eq(questionnaireReviewRequest.requestedByUserId, user.id))
      .where(eq(consultationReport.reviewRequestId, reviewRequestId)).limit(1).for("update");
    if (!record) throw new ReportError("REPORT_NOT_FOUND");
    if (!record.emailVerified) throw new ReportError("RECIPIENT_UNVERIFIED");
    if (!normalizeReportContent(record.report.content)) throw new ReportError("REPORT_EMPTY");
    if (["ACCEPTED", "DELIVERED", "SENDING"].includes(record.report.sendStatus)) throw new ReportError("REPORT_ALREADY_SENT");
    const now = new Date();
    const [locked] = await transaction.update(consultationReport).set({sendStatus: "SENDING", lastAttemptAt: now, failureCode: null, failedAt: null, updatedAt: now, sentByAdminId: adminId})
      .where(and(eq(consultationReport.id, record.report.id), eq(consultationReport.sendStatus, record.report.sendStatus))).returning();
    if (!locked) throw new ReportError("REPORT_ALREADY_SENT");
    return {report: locked, memberName: record.memberName, memberEmail: record.memberEmail, questionnaire: record.questionnaire};
  });

  const messagesUrl = new URL(`/${prepared.report.language}/messages`, origin).toString();
  const questionnaireData = serializeQuestionnaire(prepared.questionnaire);
  const assessment = assessmentOutcomeSchema.safeParse(questionnaireData.assessmentOutcome);
  const outcome = assessment.success ? assessment.data : calculatePreliminaryAssessment(questionnaireData);

  const delivery = await deliverGuidanceReport({
    reportId: prepared.report.id, language: prepared.report.language, memberName: prepared.memberName,
    recipient: prepared.memberEmail, content: prepared.report.content,
    summary: buildEmailSummary(questionnaireData, outcome.bmi, outcome.targetWeightLossPercentage, prepared.report.language),
    referenceEstimate: prepared.report.referenceEstimate,
    // Do not present one-month source prices alongside multi-month WeightPilot scenarios as if they were comparable.
    pharmacyEstimate: prepared.report.referenceEstimate ? null : prepared.report.pharmacyEstimate,
    messagesUrl,
  });
  const now = new Date();
  if (!delivery.ok) {
    await database.transaction(async (transaction) => {
      await transaction.update(consultationReport).set({sendStatus: "FAILED", failureCode: delivery.failureCode, failedAt: now, updatedAt: now})
        .where(and(eq(consultationReport.id, prepared.report.id), eq(consultationReport.sendStatus, "SENDING")));
      await transaction.insert(reportDeliveryAttempt).values({reportId: prepared.report.id, status: "FAILED", failureCode: delivery.failureCode, attemptedAt: now, adminId});
    });
    throw new ReportError("REPORT_SEND_FAILED");
  }
  const [accepted] = await database.transaction(async (transaction) => {
    const updated = await transaction.update(consultationReport).set({sendStatus: "ACCEPTED", providerMessageId: delivery.providerMessageId, acceptedAt: now, updatedAt: now})
      .where(and(eq(consultationReport.id, prepared.report.id), eq(consultationReport.sendStatus, "SENDING"))).returning();
    await transaction.insert(reportDeliveryAttempt).values({reportId: prepared.report.id, status: "ACCEPTED", providerMessageId: delivery.providerMessageId, attemptedAt: now, adminId});
    await transaction.update(questionnaireReviewRequest).set({status: "IN_REVIEW", updatedAt: now, updatedByAdminId: adminId})
      .where(and(eq(questionnaireReviewRequest.id, reviewRequestId), eq(questionnaireReviewRequest.status, "REQUESTED")));
    return updated;
  });
  if (!accepted) throw new ReportError("REPORT_SEND_FAILED");
  return serializeReport(accepted);
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
