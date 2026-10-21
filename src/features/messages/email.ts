import "server-only";

import {Resend} from "resend";
import {renderPrivateMessageNotification} from "@/features/messages/template";
import type {InvitationLanguage} from "@/features/invitations/sharing";

export async function sendPrivateMessageNotification(input: {messageId: string; recipient: string; language: InvitationLanguage; url: string}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return {ok: false as const};
  try {
    const result = await new Resend(apiKey).emails.send({from, to: input.recipient, ...renderPrivateMessageNotification(input)}, {idempotencyKey: `weightpilot-message-${input.messageId}`});
    return {ok: Boolean(result.data?.id) && !result.error};
  } catch {
    return {ok: false as const};
  }
}
