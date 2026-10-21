import "server-only";
import {Resend} from "resend";
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
    const result = await new Resend(key).emails.send({from, to: input.recipient, ...renderTreatmentRequestNotification({...input, url})}, {idempotencyKey: `treatment-request-${input.id}-${input.target}-${input.event}`});
    return {accepted: Boolean(result.data?.id) && !result.error};
  } catch { return {accepted: false}; }
}
