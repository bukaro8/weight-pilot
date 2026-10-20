import "server-only";

import {and, desc, eq} from "drizzle-orm";
import {z} from "zod";

import {getDb} from "@/db";
import {questionnaire, questionnaireReviewRequest, user} from "@/db/schema";
import {calculatePreliminaryAssessment} from "@/features/assessment/engine";
import {assessmentOutcomeSchema} from "@/features/assessment/validation";
import {healthConditionsSchema, questionnaireSubmissionSchema, type QuestionnaireDraftInput} from "@/features/questionnaire/validation";
import type {AdminQuestionnaireSubmission, QuestionnaireData} from "@/features/questionnaire/types";

export class QuestionnaireError extends Error {
  constructor(public readonly code: "QUESTIONNAIRE_NOT_EDITABLE" | "QUESTIONNAIRE_INVALID" | "QUESTIONNAIRE_NOT_FOUND") {
    super(code);
  }
}

function numberOrNull(value: string | null) {
  return value === null ? null : Number(value);
}

export function serializeQuestionnaire(record: typeof questionnaire.$inferSelect): QuestionnaireData {
  const assessment = assessmentOutcomeSchema.safeParse(record.assessmentOutcome);
  return {
    id: record.id,
    status: record.status,
    currentStep: record.currentStep,
    measurementSystem: record.measurementSystem,
    age: record.age,
    sexAssignedAtBirth: record.sexAssignedAtBirth,
    heightCm: numberOrNull(record.heightCm),
    currentWeightKg: numberOrNull(record.currentWeightKg),
    targetWeightKg: numberOrNull(record.targetWeightKg),
    healthConditions: healthConditionsSchema.parse(record.healthConditions),
    medications: record.medications,
    noMedication: record.noMedication,
    assessmentOutcome: assessment.success ? assessment.data : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    submittedAt: record.submittedAt?.toISOString() ?? null,
  };
}

export async function getOrCreateMemberQuestionnaire(userId: string) {
  const database = getDb();
  const [draft] = await database.select().from(questionnaire)
    .where(and(eq(questionnaire.userId, userId), eq(questionnaire.status, "DRAFT")))
    .orderBy(desc(questionnaire.updatedAt)).limit(1);
  if (draft) return serializeQuestionnaire(draft);

  const [submitted] = await database.select().from(questionnaire)
    .where(and(eq(questionnaire.userId, userId), eq(questionnaire.status, "SUBMITTED")))
    .orderBy(desc(questionnaire.submittedAt)).limit(1);
  if (submitted) return serializeQuestionnaire(submitted);

  await database.insert(questionnaire).values({userId}).onConflictDoNothing();
  const [created] = await database.select().from(questionnaire)
    .where(and(eq(questionnaire.userId, userId), eq(questionnaire.status, "DRAFT"))).limit(1);
  if (!created) throw new QuestionnaireError("QUESTIONNAIRE_NOT_FOUND");
  return serializeQuestionnaire(created);
}

export async function saveQuestionnaireDraft(userId: string, input: QuestionnaireDraftInput) {
  return getDb().transaction(async (transaction) => {
    const [locked] = await transaction.select().from(questionnaire).where(and(
      eq(questionnaire.id, input.questionnaireId),
      eq(questionnaire.userId, userId),
    )).limit(1).for("update");
    if (!locked || locked.status !== "DRAFT") throw new QuestionnaireError("QUESTIONNAIRE_NOT_EDITABLE");

    const [updated] = await transaction.update(questionnaire).set({
      currentStep: input.currentStep,
      measurementSystem: input.measurementSystem,
      age: input.age,
      sexAssignedAtBirth: input.sexAssignedAtBirth,
      heightCm: input.heightCm?.toString() ?? null,
      currentWeightKg: input.currentWeightKg?.toString() ?? null,
      targetWeightKg: input.targetWeightKg?.toString() ?? null,
      healthConditions: input.healthConditions,
      medications: input.noMedication ? null : input.medications,
      noMedication: input.noMedication,
      updatedAt: new Date(),
    }).where(and(eq(questionnaire.id, locked.id), eq(questionnaire.status, "DRAFT"))).returning();
    if (!updated) throw new QuestionnaireError("QUESTIONNAIRE_NOT_EDITABLE");
    return serializeQuestionnaire(updated);
  });
}

export async function submitQuestionnaire(userId: string, questionnaireId: string) {
  return getDb().transaction(async (transaction) => {
    const [locked] = await transaction.select().from(questionnaire).where(and(
      eq(questionnaire.id, questionnaireId),
      eq(questionnaire.userId, userId),
    )).limit(1).for("update");
    if (!locked || locked.status !== "DRAFT") throw new QuestionnaireError("QUESTIONNAIRE_NOT_EDITABLE");

    const parsed = questionnaireSubmissionSchema.safeParse({
      ...serializeQuestionnaire(locked), questionnaireId: locked.id, currentStep: 5,
    });
    if (!parsed.success) throw new QuestionnaireError("QUESTIONNAIRE_INVALID");

    const submittedAt = new Date();
    const assessmentOutcome = calculatePreliminaryAssessment({...serializeQuestionnaire(locked), status: "SUBMITTED"});
    const [submitted] = await transaction.update(questionnaire).set({
      status: "SUBMITTED", currentStep: 5, assessmentOutcome,
      assessmentVersion: assessmentOutcome.engineVersion, submittedAt, updatedAt: submittedAt,
    }).where(and(eq(questionnaire.id, locked.id), eq(questionnaire.status, "DRAFT"))).returning();
    if (!submitted) throw new QuestionnaireError("QUESTIONNAIRE_NOT_EDITABLE");
    return serializeQuestionnaire(submitted);
  });
}

export async function getMemberSubmittedQuestionnaire(userId: string) {
  const [record] = await getDb().select().from(questionnaire).where(and(
    eq(questionnaire.userId, userId), eq(questionnaire.status, "SUBMITTED"),
  )).orderBy(desc(questionnaire.submittedAt)).limit(1);
  if (!record) throw new QuestionnaireError("QUESTIONNAIRE_NOT_FOUND");

  const serialized = serializeQuestionnaire(record);
  if (serialized.assessmentOutcome) return serialized;
  const assessmentOutcome = calculatePreliminaryAssessment(serialized);
  const [updated] = await getDb().update(questionnaire).set({
    assessmentOutcome, assessmentVersion: assessmentOutcome.engineVersion,
  }).where(and(eq(questionnaire.id, record.id), eq(questionnaire.userId, userId))).returning();
  return serializeQuestionnaire(updated ?? record);
}

export async function listAdminQuestionnaireSubmissions(): Promise<AdminQuestionnaireSubmission[]> {
  const records = await getDb().select({
    questionnaire, memberName: user.name, memberEmail: user.email, memberLanguage: user.preferredLanguage,
    reportLanguage: questionnaireReviewRequest.reportLanguage,
    reviewRequestId: questionnaireReviewRequest.id,
    reviewStatus: questionnaireReviewRequest.status,
    reviewRequestedAt: questionnaireReviewRequest.requestedAt,
    reviewUpdatedAt: questionnaireReviewRequest.updatedAt,
  }).from(questionnaireReviewRequest)
    .innerJoin(questionnaire, eq(questionnaireReviewRequest.questionnaireId, questionnaire.id))
    .innerJoin(user, eq(questionnaire.userId, user.id))
    .where(eq(questionnaire.status, "SUBMITTED")).orderBy(desc(questionnaireReviewRequest.requestedAt));
  return records.map((record) => ({
    ...serializeQuestionnaire(record.questionnaire), memberName: record.memberName, memberEmail: record.memberEmail, memberLanguage: record.memberLanguage, reportLanguage: record.reportLanguage,
    reviewRequestId: record.reviewRequestId, reviewStatus: record.reviewStatus,
    reviewRequestedAt: record.reviewRequestedAt.toISOString(), reviewUpdatedAt: record.reviewUpdatedAt.toISOString(),
  }));
}

export async function deleteQuestionnaireSubmission(questionnaireId: string) {
  if (!z.uuid().safeParse(questionnaireId).success) return false;
  const [deleted] = await getDb().delete(questionnaire).where(and(
    eq(questionnaire.id, questionnaireId), eq(questionnaire.status, "SUBMITTED"),
  )).returning({id: questionnaire.id});
  return Boolean(deleted);
}
