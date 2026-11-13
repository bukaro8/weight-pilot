import "server-only";

import {and, desc, eq, isNotNull, isNull, or} from "drizzle-orm";
import {z} from "zod";
import {getDb} from "@/db";
import {consultationReport, messageConversation, questionnaire, questionnaireReviewRequest, treatmentAccessRequest, treatmentPaymentInstruction, treatmentRequestStatusEvent, treatmentStrengthPrice, user} from "@/db/schema";
import {listMemberAvailableReports} from "@/features/reports/member";
import {canBrowseTreatments, canChangeRequestStatus} from "./policy";
import type {CreateTreatmentRequest, UpdateTreatmentRequest} from "./validation";
import {calculatePaymentSnapshot} from "./payment";

export async function getCatalogueAccess(member: typeof user.$inferSelect) {
  const reports = await listMemberAvailableReports(member.id);
  return {eligible: canBrowseTreatments(member, reports.length > 0), reportId: reports[0]?.id ?? null};
}

export async function getMemberRequests(memberId: string) {
  return getDb().select().from(treatmentAccessRequest).where(eq(treatmentAccessRequest.memberId, memberId)).orderBy(desc(treatmentAccessRequest.createdAt));
}

export async function getMemberRequest(memberId: string, requestId: string) {
  if (!z.uuid().safeParse(requestId).success) return null;
  const [record] = await getDb().select().from(treatmentAccessRequest).where(and(eq(treatmentAccessRequest.memberId, memberId), eq(treatmentAccessRequest.id, requestId))).limit(1);
  return record ?? null;
}

export async function getLatestMemberDeliveryDetails(memberId: string) {
  const [request] = await getDb().select({
    fullName: treatmentAccessRequest.fullName,
    telephone: treatmentAccessRequest.telephone,
    streetAddress: treatmentAccessRequest.streetAddress,
    flatNumber: treatmentAccessRequest.flatNumber,
    buildingName: treatmentAccessRequest.buildingName,
    city: treatmentAccessRequest.city,
    postcode: treatmentAccessRequest.postcode,
  }).from(treatmentAccessRequest).where(eq(treatmentAccessRequest.memberId, memberId))
    .orderBy(desc(treatmentAccessRequest.createdAt)).limit(1);
  return request ?? null;
}

export async function getAdminRequests(status?: string) {
  const rows = await getDb().select({request: treatmentAccessRequest, memberName: user.name, memberEmail: user.email})
    .from(treatmentAccessRequest).innerJoin(user, eq(treatmentAccessRequest.memberId, user.id))
    .orderBy(desc(treatmentAccessRequest.createdAt));
  return status ? rows.filter((row) => row.request.status === status) : rows;
}

export async function getAdminRequest(requestId: string) {
  if (!z.uuid().safeParse(requestId).success) return null;
  const [row] = await getDb().select({request: treatmentAccessRequest, memberName: user.name, memberEmail: user.email, emailVerified: user.emailVerified})
    .from(treatmentAccessRequest).innerJoin(user, eq(treatmentAccessRequest.memberId, user.id))
    .where(eq(treatmentAccessRequest.id, requestId)).limit(1);
  if (!row) return null;
  const [report] = row.request.reportId ? await getDb().select({reviewRequestId: consultationReport.reviewRequestId}).from(consultationReport).where(eq(consultationReport.id, row.request.reportId)).limit(1) : [];
  const [conversation] = await getDb().select({id: messageConversation.id}).from(messageConversation).where(eq(messageConversation.memberId, row.request.memberId)).limit(1);
  const events = await getDb().select({status: treatmentRequestStatusEvent.status, createdAt: treatmentRequestStatusEvent.createdAt})
    .from(treatmentRequestStatusEvent).where(eq(treatmentRequestStatusEvent.requestId, requestId)).orderBy(desc(treatmentRequestStatusEvent.createdAt));
  const [payment] = await getDb().select().from(treatmentPaymentInstruction).where(eq(treatmentPaymentInstruction.requestId, requestId)).limit(1);
  return {...row, reviewRequestId: report?.reviewRequestId ?? null, conversationId: conversation?.id ?? null, events, payment: payment ?? null};
}

export async function getActiveAdministrator() {
  const [admin] = await getDb().select({email: user.email, preferredLanguage: user.preferredLanguage})
    .from(user).where(and(eq(user.role, "ADMIN"), eq(user.status, "ACTIVE"), eq(user.emailVerified, true))).limit(1);
  return admin ?? null;
}

export async function createTreatmentRequest(memberId: string, input: CreateTreatmentRequest) {
  return getDb().transaction(async (tx) => {
    const [member] = await tx.select().from(user).where(eq(user.id, memberId)).limit(1).for("update");
    if (!member || !canBrowseTreatments(member, true)) throw new Error("REQUEST_FORBIDDEN");
    const [report] = await tx.select({id: consultationReport.id}).from(consultationReport)
      .innerJoin(questionnaireReviewRequest, eq(consultationReport.reviewRequestId, questionnaireReviewRequest.id))
      .innerJoin(questionnaire, eq(questionnaireReviewRequest.questionnaireId, questionnaire.id))
      .where(and(eq(consultationReport.id, input.reportId), eq(questionnaire.userId, memberId), eq(questionnaireReviewRequest.requestedByUserId, memberId), eq(questionnaire.status, "SUBMITTED"), or(
        and(eq(consultationReport.sendStatus, "ACCEPTED"), isNotNull(consultationReport.providerMessageId), isNotNull(consultationReport.acceptedAt)),
        and(eq(consultationReport.sendStatus, "DELIVERED"), isNotNull(consultationReport.providerMessageId), isNotNull(consultationReport.deliveredAt)),
      ))).limit(1);
    if (!report) throw new Error("REQUEST_FORBIDDEN");
    const address = [input.flatNumber, input.buildingName, input.streetAddress, input.city].filter(Boolean).join(", ");
    const [created] = await tx.insert(treatmentAccessRequest).values({memberId, ...input, address, message: null})
      .onConflictDoNothing().returning();
    if (created) {
      await tx.insert(treatmentRequestStatusEvent).values({requestId: created.id, status: "SUBMITTED", changedByUserId: memberId});
      return {request: created, created: true};
    }
    const [existing] = await tx.select().from(treatmentAccessRequest).where(and(eq(treatmentAccessRequest.memberId, memberId), eq(treatmentAccessRequest.clientRequestId, input.clientRequestId))).limit(1);
    if (!existing || existing.reportId !== input.reportId || existing.treatment !== input.treatment || existing.fullName !== input.fullName || existing.streetAddress !== input.streetAddress || (existing.flatNumber ?? "") !== input.flatNumber || (existing.buildingName ?? "") !== input.buildingName || existing.city !== input.city || existing.postcode !== input.postcode || existing.telephone !== input.telephone) throw new Error("REQUEST_CONFLICT");
    return {request: existing, created: false};
  });
}

export async function updateTreatmentRequest(adminId: string, requestId: string, input: UpdateTreatmentRequest) {
  if (!z.uuid().safeParse(requestId).success) throw new Error("REQUEST_NOT_FOUND");
  return getDb().transaction(async (tx) => {
    const [admin] = await tx.select().from(user).where(eq(user.id, adminId)).limit(1);
    if (!admin || admin.role !== "ADMIN" || admin.status !== "ACTIVE" || !admin.emailVerified) throw new Error("REQUEST_FORBIDDEN");
    const [current] = await tx.select().from(treatmentAccessRequest).where(eq(treatmentAccessRequest.id, requestId)).limit(1).for("update");
    if (!current) throw new Error("REQUEST_NOT_FOUND");
    if (!canChangeRequestStatus(current.status, input.status)) throw new Error("REQUEST_INVALID_TRANSITION");
    if (["APPROVED_FOR_NEXT_STEPS", "DECLINED"].includes(current.status) && (current.status !== input.status || current.approvedTreatment !== input.approvedTreatment || current.approvedStrength !== input.approvedStrength || current.declineReason !== input.declineReason)) throw new Error("REQUEST_ALREADY_FINAL");
    const changed = current.status !== input.status;
    const [updated] = await tx.update(treatmentAccessRequest).set({
      status: input.status,
      internalNote: input.internalNote,
      declineReason: input.status === "DECLINED" ? input.declineReason : null,
      approvedTreatment: input.status === "APPROVED_FOR_NEXT_STEPS" ? input.approvedTreatment : null,
      approvedStrength: input.status === "APPROVED_FOR_NEXT_STEPS" ? input.approvedStrength : null,
      ...(changed ? {memberViewedAt: null} : {}),
      updatedAt: new Date(),
    }).where(eq(treatmentAccessRequest.id, requestId)).returning();
    if (changed) await tx.insert(treatmentRequestStatusEvent).values({requestId, status: input.status, changedByUserId: adminId});
    return {request: updated, changed};
  });
}

export async function recordApprovalEmailAccepted(adminId: string, requestId: string, providerMessageId: string) {
  return getDb().transaction(async (tx) => {
    const [admin] = await tx.select({role: user.role, status: user.status, emailVerified: user.emailVerified}).from(user).where(eq(user.id, adminId)).limit(1);
    if (!admin || admin.role !== "ADMIN" || admin.status !== "ACTIVE" || !admin.emailVerified) throw new Error("REQUEST_FORBIDDEN");
    const [updated] = await tx.update(treatmentAccessRequest).set({approvalEmailProviderMessageId: providerMessageId, approvalEmailAcceptedAt: new Date(), updatedAt: new Date()})
      .where(and(eq(treatmentAccessRequest.id, requestId), eq(treatmentAccessRequest.status, "APPROVED_FOR_NEXT_STEPS"), isNull(treatmentAccessRequest.approvalEmailAcceptedAt))).returning({id: treatmentAccessRequest.id});
    return Boolean(updated);
  });
}

export async function claimTreatmentPaymentInstruction(adminId: string, requestId: string, input: {prescriptionReference: string; supplyAuthorisationReference: string}) {
  return getDb().transaction(async (tx) => {
    const [admin] = await tx.select({role: user.role, status: user.status, emailVerified: user.emailVerified}).from(user).where(eq(user.id, adminId)).limit(1);
    if (!admin || admin.role !== "ADMIN" || admin.status !== "ACTIVE" || !admin.emailVerified) throw new Error("REQUEST_FORBIDDEN");
    const [request] = await tx.select().from(treatmentAccessRequest).where(eq(treatmentAccessRequest.id, requestId)).limit(1).for("update");
    if (!request || request.status !== "APPROVED_FOR_NEXT_STEPS" || !request.approvedTreatment || !request.approvedStrength) throw new Error("REQUEST_NOT_APPROVED");
    const [member] = await tx.select({email: user.email, emailVerified: user.emailVerified, status: user.status, name: user.name}).from(user).where(eq(user.id, request.memberId)).limit(1);
    if (!member?.emailVerified || member.status !== "ACTIVE") throw new Error("MEMBER_NOT_VERIFIED");
    const [existing] = await tx.select().from(treatmentPaymentInstruction).where(eq(treatmentPaymentInstruction.requestId, requestId)).limit(1).for("update");
    if (existing) throw new Error(existing.sendStatus === "ACCEPTED" ? "PAYMENT_ALREADY_SENT" : "PAYMENT_ATTEMPT_EXISTS");
    const [price] = await tx.select({pricePence: treatmentStrengthPrice.pricePence}).from(treatmentStrengthPrice).where(and(eq(treatmentStrengthPrice.treatment, request.approvedTreatment), eq(treatmentStrengthPrice.strength, request.approvedStrength))).limit(1);
    const snapshot = calculatePaymentSnapshot({treatment: request.approvedTreatment, strength: request.approvedStrength, pricePence: price?.pricePence ?? null});
    await tx.insert(treatmentPaymentInstruction).values({requestId, ...snapshot, prescriptionReference: input.prescriptionReference, supplyAuthorisationReference: input.supplyAuthorisationReference, verifiedByAdminId: adminId});
    return {snapshot, recipient: member.email, memberName: member.name, language: request.language};
  });
}

export async function recordTreatmentPaymentResult(requestId: string, result: {status: "ACCEPTED" | "FAILED" | "UNCERTAIN"; providerMessageId?: string; failureCode?: string}) {
  await getDb().update(treatmentPaymentInstruction).set({sendStatus: result.status, providerMessageId: result.providerMessageId ?? null, failureCode: result.failureCode ?? null, sentAt: result.status === "ACCEPTED" ? new Date() : null})
    .where(and(eq(treatmentPaymentInstruction.requestId, requestId), eq(treatmentPaymentInstruction.sendStatus, "SENDING")));
}
