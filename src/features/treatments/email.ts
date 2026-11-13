import "server-only";
import {Resend} from "resend";
import {configuredReplyTo} from "@/features/email/notice";
import {publicInvitationOrigin} from "@/features/invitations/sharing";
import {renderTreatmentRequestNotification} from "./email-template";

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

export async function submitTreatmentCommunication(id: string, recipient: string, content: {subject: string; html: string; text?: string}) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return {status: "FAILED" as const, reason: "EMAIL_NOT_CONFIGURED"};
  try {
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send({from: process.env.EMAIL_FROM, to: recipient, ...content, replyTo: configuredReplyTo(process.env.EMAIL_FROM, process.env.EMAIL_REPLY_TO)}, {idempotencyKey: `weightpilot-treatment-communication-${id}`, signal: AbortSignal.timeout(12_000)});
    if (result.error) return {status: "FAILED" as const, reason: "PROVIDER_REJECTED"};
    return result.data?.id ? {status: "ACCEPTED" as const, providerMessageId: result.data.id} : {status: "UNCERTAIN" as const, reason: "ACCEPTANCE_UNCERTAIN"};
  } catch {return {status: "UNCERTAIN" as const, reason: "ACCEPTANCE_UNCERTAIN"};}
}
