import "server-only";
import {Resend} from "resend";
import {configuredReplyTo} from "@/features/email/notice";
import {publicInvitationOrigin} from "@/features/invitations/sharing";
import {renderTreatmentRequestNotification} from "./email-template";
import {renderTreatmentApprovalEmail, renderTreatmentPaymentEmail} from "./email-template";

export async function notifyTreatmentRequest(input: {id: string; language: "en" | "es"; recipient: string; target: "admin" | "member"; event: string}) {
  const from = process.env.EMAIL_FROM;
  const key = process.env.RESEND_API_KEY;
  const origin = publicInvitationOrigin(process.env.PUBLIC_APP_URL);
  if (!from || !key || !origin) return {accepted: false};
  const path = input.target === "admin" ? `/${input.language}/admin/treatment-requests/${input.id}` : `/${input.language}/requests/${input.id}`;
  const url = new URL(path, origin).toString();
  try {
    const result = await new Resend(key).emails.send({from, to: input.recipient, ...renderTreatmentRequestNotification({...input, url, messagesUrl: input.target === "member" ? new URL(`/${input.language}/messages`, origin).toString() : undefined}), replyTo: configuredReplyTo(from, process.env.EMAIL_REPLY_TO)}, {idempotencyKey: `treatment-request-${input.id}-${input.target}-${input.event}`, signal: AbortSignal.timeout(12_000)});
    return {accepted: Boolean(result.data?.id) && !result.error};
  } catch { return {accepted: false}; }
}

export async function sendTreatmentApprovalEmail(input: {
  id: string;
  language: "en" | "es";
  recipient: string;
  memberName: string;
  treatment: "SEMAGLUTIDE" | "TIRZEPATIDE";
  strength: string;
}) {
  const from = process.env.EMAIL_FROM;
  const key = process.env.RESEND_API_KEY;
  const origin = publicInvitationOrigin(process.env.PUBLIC_APP_URL);
  if (!from || !key || !origin) return {accepted: false as const, reason: "NOT_CONFIGURED" as const};
  const messagesUrl = new URL(`/${input.language}/messages`, origin).toString();
  try {
    const result = await new Resend(key).emails.send({
      from,
      to: input.recipient,
      replyTo: configuredReplyTo(from, process.env.EMAIL_REPLY_TO),
      ...renderTreatmentApprovalEmail({
        language: input.language,
        memberName: input.memberName,
        treatment: input.treatment,
        strength: input.strength,
        messagesUrl,
      }),
    }, {idempotencyKey: `weightpilot-treatment-approval-${input.id}`});
    if (result.error) return {accepted: false as const, reason: "REJECTED" as const, providerMessageId: null};
    return result.data?.id
      ? {accepted: true as const, reason: null, providerMessageId: result.data.id}
      : {accepted: false as const, reason: "UNCERTAIN" as const, providerMessageId: null};
  } catch {
    return {accepted: false as const, reason: "UNCERTAIN" as const};
  }
}

export async function sendTreatmentPaymentEmail(input: {
  id: string;
  language: "en" | "es";
  recipient: string;
  memberName: string;
  snapshot: {treatment: "SEMAGLUTIDE" | "TIRZEPATIDE"; strength: string; itemPricePence: number; deliveryPricePence: number; totalPence: number};
}) {
  const from = process.env.EMAIL_FROM;
  const key = process.env.RESEND_API_KEY;
  const origin = publicInvitationOrigin(process.env.PUBLIC_APP_URL);
  const accountName = process.env.ACCOUNT_NAME?.trim();
  const sortCode = process.env.SORT_CODE?.trim();
  const accountNumber = process.env.ACCOUNT_NUMBER?.trim();
  if (!from || !key || !origin || !accountName || !sortCode || !accountNumber) return {accepted: false as const, reason: "NOT_CONFIGURED" as const};
  const messagesUrl = new URL(`/${input.language}/messages`, origin).toString();
  const imageUrl = new URL(input.snapshot.treatment === "SEMAGLUTIDE" ? "/treatments/semaglutide.jpg" : "/treatments/tirzepatide.jpg", origin).toString();
  try {
    const result = await new Resend(key).emails.send({
      from, to: input.recipient, replyTo: configuredReplyTo(from, process.env.EMAIL_REPLY_TO),
      ...renderTreatmentPaymentEmail({...input.snapshot, language: input.language, memberName: input.memberName, messagesUrl, imageUrl, accountName, sortCode, accountNumber}),
    }, {idempotencyKey: `weightpilot-treatment-payment-${input.id}`, signal: AbortSignal.timeout(12_000)});
    if (result.error) return {accepted: false as const, reason: "REJECTED" as const};
    return result.data?.id ? {accepted: true as const, reason: null, providerMessageId: result.data.id} : {accepted: false as const, reason: "UNCERTAIN" as const};
  } catch {return {accepted: false as const, reason: "UNCERTAIN" as const};}
}
