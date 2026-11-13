import "server-only";

import {and, desc, eq} from "drizzle-orm";
import {z} from "zod";
import {getDb} from "@/db";
import {treatmentAccessRequest, treatmentRequestCommunication, treatmentStrengthPrice, treatmentSupplyAuthorisation, user} from "@/db/schema";
import {publicInvitationOrigin} from "@/features/invitations/sharing";
import {renderTreatmentApprovalEmail, renderTreatmentPaymentEmail, renderTreatmentRequestNotification, renderTreatmentUpdateEmail} from "./email-template";
import {calculatePaymentSnapshot, paymentEnvironmentConfigured} from "./payment";
import {submitTreatmentCommunication} from "./email";
import type {treatmentCommunicationSchema} from "./validation";

type ComposeInput = z.infer<typeof treatmentCommunicationSchema>;
type Treatment = ComposeInput["treatment"];
type EmailContent = {subject: string; html: string; text: string};

function productImageUrl(origin: string, treatment: Treatment) {
  return new URL(treatment === "SEMAGLUTIDE" ? "/treatments/semaglutide.jpg" : "/treatments/tirzepatide.jpg", origin).toString();
}

function emailEnvironment() {
  const origin = publicInvitationOrigin(process.env.PUBLIC_APP_URL);
  if (!origin || !process.env.EMAIL_FROM || !process.env.RESEND_API_KEY) throw new Error("EMAIL_NOT_CONFIGURED");
  return origin;
}

async function requireAdminAccount(adminId: string) {
  const [admin] = await getDb().select({role: user.role, status: user.status, verified: user.emailVerified}).from(user).where(eq(user.id, adminId)).limit(1);
  if (!admin || admin.role !== "ADMIN" || admin.status !== "ACTIVE" || !admin.verified) throw new Error("REQUEST_FORBIDDEN");
}

export async function listTreatmentCommunications(adminId: string, requestId: string) {
  await requireAdminAccount(adminId);
  return getDb().select().from(treatmentRequestCommunication).where(eq(treatmentRequestCommunication.requestId, requestId)).orderBy(desc(treatmentRequestCommunication.attemptedAt));
}

export async function getTreatmentCommunication(adminId: string, requestId: string, emailId: string) {
  await requireAdminAccount(adminId);
  if (!z.uuid().safeParse(requestId).success || !z.uuid().safeParse(emailId).success) return null;
  const [row] = await getDb().select().from(treatmentRequestCommunication).where(and(eq(treatmentRequestCommunication.requestId, requestId), eq(treatmentRequestCommunication.id, emailId))).limit(1);
  return row ?? null;
}

export async function listSupplyAuthorisations(adminId: string, requestId: string) {
  await requireAdminAccount(adminId);
  return getDb().select({id: treatmentSupplyAuthorisation.id, treatment: treatmentSupplyAuthorisation.treatment, strength: treatmentSupplyAuthorisation.strength, verifiedAt: treatmentSupplyAuthorisation.verifiedAt})
    .from(treatmentSupplyAuthorisation).where(eq(treatmentSupplyAuthorisation.requestId, requestId)).orderBy(desc(treatmentSupplyAuthorisation.verifiedAt));
}

export async function recordSupplyAuthorisation(adminId: string, requestId: string, input: {treatment: Treatment; strength: string; prescriptionReference: string; supplyAuthorisationReference: string}) {
  return getDb().transaction(async (tx) => {
    const [admin] = await tx.select({role: user.role, status: user.status, verified: user.emailVerified}).from(user).where(eq(user.id, adminId)).limit(1);
    if (!admin || admin.role !== "ADMIN" || admin.status !== "ACTIVE" || !admin.verified) throw new Error("REQUEST_FORBIDDEN");
    const [request] = await tx.select({status: treatmentAccessRequest.status}).from(treatmentAccessRequest).where(eq(treatmentAccessRequest.id, requestId)).limit(1).for("update");
    if (!request || request.status !== "APPROVED_FOR_NEXT_STEPS") throw new Error("REQUEST_NOT_APPROVED");
    const [row] = await tx.insert(treatmentSupplyAuthorisation).values({requestId, treatment: input.treatment, strength: input.strength, prescriptionReference: input.prescriptionReference, supplyAuthorisationReference: input.supplyAuthorisationReference, verifiedByAdminId: adminId}).returning({id: treatmentSupplyAuthorisation.id});
    return row;
  });
}

export async function buildTreatmentCommunication(adminId: string, requestId: string, input: ComposeInput) {
  await requireAdminAccount(adminId);
  const origin = emailEnvironment();
  const [row] = await getDb().select({request: treatmentAccessRequest, member: user}).from(treatmentAccessRequest)
    .innerJoin(user, eq(treatmentAccessRequest.memberId, user.id)).where(eq(treatmentAccessRequest.id, requestId)).limit(1);
  if (!row) throw new Error("REQUEST_NOT_FOUND");
  if (row.member.status !== "ACTIVE" || !row.member.emailVerified) throw new Error("MEMBER_NOT_VERIFIED");
  const {request, member} = row;
  const messagesUrl = new URL(`/${request.language}/messages`, origin).toString();
  const imageUrl = productImageUrl(origin, input.treatment);
  let snapshot: ReturnType<typeof calculatePaymentSnapshot> | null = null;
  let content: EmailContent;
  if (input.type === "PAYMENT_INSTRUCTIONS") {
    if (request.status !== "APPROVED_FOR_NEXT_STEPS") throw new Error("REQUEST_NOT_APPROVED");
    const [authorisation] = await getDb().select({id: treatmentSupplyAuthorisation.id}).from(treatmentSupplyAuthorisation).where(and(
      eq(treatmentSupplyAuthorisation.id, input.authorisationId!), eq(treatmentSupplyAuthorisation.requestId, requestId),
      eq(treatmentSupplyAuthorisation.treatment, input.treatment), eq(treatmentSupplyAuthorisation.strength, input.strength),
    )).limit(1);
    if (!authorisation) throw new Error("SUPPLY_AUTHORISATION_REQUIRED");
    if (!paymentEnvironmentConfigured({accountName: process.env.ACCOUNT_NAME, sortCode: process.env.SORT_CODE, accountNumber: process.env.ACCOUNT_NUMBER})) throw new Error("BANK_DETAILS_NOT_CONFIGURED");
    const [price] = await getDb().select({pricePence: treatmentStrengthPrice.pricePence}).from(treatmentStrengthPrice).where(and(eq(treatmentStrengthPrice.treatment, input.treatment), eq(treatmentStrengthPrice.strength, input.strength))).limit(1);
    snapshot = calculatePaymentSnapshot({treatment: input.treatment, strength: input.strength, pricePence: price?.pricePence ?? null});
    content = renderTreatmentPaymentEmail({...snapshot, language: request.language, memberName: member.name, messagesUrl, imageUrl, accountName: process.env.ACCOUNT_NAME!.trim(), sortCode: process.env.SORT_CODE!.trim(), accountNumber: process.env.ACCOUNT_NUMBER!.trim()});
  } else {
    content = renderTreatmentUpdateEmail({language: request.language, memberName: member.name, treatment: input.treatment, strength: input.strength, message: input.message, messagesUrl, imageUrl});
  }
  return {content, recipient: member.email, language: request.language, snapshot};
}

export async function claimTreatmentCommunication(adminId: string, requestId: string, input: ComposeInput) {
  const prepared = await buildTreatmentCommunication(adminId, requestId, input);
  return getDb().transaction(async (tx) => {
    const [admin] = await tx.select({role: user.role, status: user.status, verified: user.emailVerified}).from(user).where(eq(user.id, adminId)).limit(1);
    if (!admin || admin.role !== "ADMIN" || admin.status !== "ACTIVE" || !admin.verified) throw new Error("REQUEST_FORBIDDEN");
    const [request] = await tx.select({memberId: treatmentAccessRequest.memberId, status: treatmentAccessRequest.status}).from(treatmentAccessRequest).where(eq(treatmentAccessRequest.id, requestId)).limit(1).for("update");
    if (!request) throw new Error("REQUEST_NOT_FOUND");
    const [existing] = await tx.select({id: treatmentRequestCommunication.id}).from(treatmentRequestCommunication).where(and(eq(treatmentRequestCommunication.requestId, requestId), eq(treatmentRequestCommunication.clientMessageId, input.clientMessageId))).limit(1);
    if (existing) throw new Error("EMAIL_ALREADY_QUEUED");
    const [member] = await tx.select({email: user.email, status: user.status, verified: user.emailVerified}).from(user).where(eq(user.id, request.memberId)).limit(1);
    if (!member || member.email !== prepared.recipient || member.status !== "ACTIVE" || !member.verified) throw new Error("RECIPIENT_CHANGED");
    if (input.type === "PAYMENT_INSTRUCTIONS") {
      if (request.status !== "APPROVED_FOR_NEXT_STEPS") throw new Error("REQUEST_NOT_APPROVED");
      const [authorisation] = await tx.select({id: treatmentSupplyAuthorisation.id}).from(treatmentSupplyAuthorisation).where(and(eq(treatmentSupplyAuthorisation.id, input.authorisationId!), eq(treatmentSupplyAuthorisation.requestId, requestId), eq(treatmentSupplyAuthorisation.treatment, input.treatment), eq(treatmentSupplyAuthorisation.strength, input.strength))).limit(1);
      if (!authorisation) throw new Error("SUPPLY_AUTHORISATION_REQUIRED");
      const [price] = await tx.select({pricePence: treatmentStrengthPrice.pricePence}).from(treatmentStrengthPrice).where(and(eq(treatmentStrengthPrice.treatment, input.treatment), eq(treatmentStrengthPrice.strength, input.strength))).limit(1);
      if (price?.pricePence !== prepared.snapshot?.itemPricePence) throw new Error("PRICE_CHANGED_REPREVIEW");
    }
    const [created] = await tx.insert(treatmentRequestCommunication).values({
      requestId, clientMessageId: input.clientMessageId, type: input.type, language: prepared.language, treatment: input.treatment, strength: input.strength,
      itemPricePence: prepared.snapshot?.itemPricePence ?? null, deliveryPricePence: prepared.snapshot?.deliveryPricePence ?? null, totalPence: prepared.snapshot?.totalPence ?? null,
      recipient: prepared.recipient, subject: prepared.content.subject, html: prepared.content.html, plainText: prepared.content.text,
      authorisedSupplyId: input.type === "PAYMENT_INSTRUCTIONS" ? input.authorisationId : null, createdByAdminId: adminId,
    }).returning({id: treatmentRequestCommunication.id});
    return {...created, ...prepared};
  });
}

export async function claimDecisionNotice(adminId: string, requestId: string) {
  const origin = emailEnvironment();
  return getDb().transaction(async (tx) => {
    const [admin] = await tx.select({role: user.role, status: user.status, verified: user.emailVerified}).from(user).where(eq(user.id, adminId)).limit(1);
    if (!admin || admin.role !== "ADMIN" || admin.status !== "ACTIVE" || !admin.verified) throw new Error("REQUEST_FORBIDDEN");
    const [row] = await tx.select({request: treatmentAccessRequest, member: user}).from(treatmentAccessRequest).innerJoin(user, eq(treatmentAccessRequest.memberId, user.id)).where(eq(treatmentAccessRequest.id, requestId)).limit(1).for("update");
    if (!row) throw new Error("REQUEST_NOT_FOUND");
    if (!row.member.emailVerified || row.member.status !== "ACTIVE") throw new Error("MEMBER_NOT_VERIFIED");
    if (!(["APPROVED_FOR_NEXT_STEPS", "DECLINED"] as string[]).includes(row.request.status)) throw new Error("REQUEST_INVALID_TRANSITION");
    const [existing] = await tx.select({id: treatmentRequestCommunication.id}).from(treatmentRequestCommunication).where(and(eq(treatmentRequestCommunication.requestId, requestId), eq(treatmentRequestCommunication.clientMessageId, requestId))).limit(1);
    if (existing || row.request.approvalEmailAcceptedAt) throw new Error("EMAIL_ALREADY_QUEUED");
    const language = row.request.language;
    const content = row.request.status === "APPROVED_FOR_NEXT_STEPS" && row.request.approvedTreatment && row.request.approvedStrength
      ? renderTreatmentApprovalEmail({language, memberName: row.member.name, treatment: row.request.approvedTreatment, strength: row.request.approvedStrength, messagesUrl: new URL(`/${language}/messages`, origin).toString(), imageUrl: productImageUrl(origin, row.request.approvedTreatment)})
      : renderTreatmentRequestNotification({language, target: "member", event: "DECLINED", url: new URL(`/${language}/requests/${requestId}`, origin).toString(), messagesUrl: new URL(`/${language}/messages`, origin).toString()});
    const [created] = await tx.insert(treatmentRequestCommunication).values({requestId, clientMessageId: requestId, type: "DECISION_NOTICE", language, treatment: row.request.approvedTreatment, strength: row.request.approvedStrength, recipient: row.member.email, subject: content.subject, html: content.html, plainText: "text" in content ? String(content.text) : null, createdByAdminId: adminId}).returning({id: treatmentRequestCommunication.id});
    return {...created, content, recipient: row.member.email};
  });
}

export {submitTreatmentCommunication};

export async function recordTreatmentCommunicationResult(id: string, result: {status: "ACCEPTED" | "FAILED" | "UNCERTAIN"; providerMessageId?: string; reason?: string}) {
  const [updated] = await getDb().update(treatmentRequestCommunication).set({sendStatus: result.status, providerMessageId: result.providerMessageId ?? null, failureCode: result.reason ?? null, acceptedAt: result.status === "ACCEPTED" ? new Date() : null})
    .where(and(eq(treatmentRequestCommunication.id, id), eq(treatmentRequestCommunication.sendStatus, "SENDING"))).returning({id: treatmentRequestCommunication.id});
  if (!updated) throw new Error("EMAIL_RESULT_NOT_RECORDED");
}

export async function applyTreatmentCommunicationDeliveryEvent(input: {type: string; providerMessageId: string}) {
  if (!input.providerMessageId) return;
  const delivered = input.type === "email.delivered";
  await getDb().update(treatmentRequestCommunication).set({deliveryStatus: delivered ? "DELIVERED" : "FAILED", ...(delivered ? {deliveredAt: new Date()} : {})})
    .where(and(eq(treatmentRequestCommunication.providerMessageId, input.providerMessageId), eq(treatmentRequestCommunication.sendStatus, "ACCEPTED")));
}
