import "server-only";
import {Resend} from "resend";
import {publicInvitationOrigin} from "@/features/invitations/sharing";
import {renderTreatmentRequestNotification} from "./email-template";
import {renderTreatmentApprovalEmail} from "./email-template";

export async function notifyTreatmentRequest(input: {id: string; language: "en" | "es"; recipient: string; target: "admin" | "member"; event: string}) {
  const from = process.env.EMAIL_FROM;
  const key = process.env.RESEND_API_KEY;
  const origin = publicInvitationOrigin(process.env.PUBLIC_APP_URL);
  if (!from || !key || !origin) return {accepted: false};
  const path = input.target === "admin" ? `/${input.language}/admin/treatment-requests/${input.id}` : `/${input.language}/requests/${input.id}`;
  const url = new URL(path, origin).toString();
  try {
    const result = await new Resend(key).emails.send({from, to: input.recipient, ...renderTreatmentRequestNotification({...input, url})}, {idempotencyKey: `treatment-request-${input.id}-${input.target}-${input.event}`});
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
      ...renderTreatmentApprovalEmail({
        language: input.language,
        memberName: input.memberName,
        treatment: input.treatment,
        strength: input.strength,
        messagesUrl,
        accountName: process.env.ACCOUNT_NAME,
        sortCode: process.env.SORT_CODE,
        accountNumber: process.env.ACCOUNT_NUMBER,
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
