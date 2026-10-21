import "server-only";

import {Resend} from "resend";

import {renderInvitationEmail} from "@/features/invitations/template";
import {invitationShareMessage, type InvitationLanguage} from "@/features/invitations/sharing";

export async function sendInvitationEmail(input: {recipient: string; language: InvitationLanguage; link: string}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return {ok: false as const, reason: "NOT_CONFIGURED" as const};
  try {
    const message = invitationShareMessage(input.language, input.link);
    const result = await new Resend(apiKey).emails.send({from, to: input.recipient, ...renderInvitationEmail(input.language, input.link, message)});
    if (result.error || !result.data?.id) return {ok: false as const, reason: "PROVIDER_REJECTED" as const};
    return {ok: true as const};
  } catch {
    return {ok: false as const, reason: "PROVIDER_UNAVAILABLE" as const};
  }
}
