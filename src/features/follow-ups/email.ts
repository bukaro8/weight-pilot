import "server-only";

import {Resend} from "resend";
import {configuredReplyTo} from "@/features/email/notice";
import {renderFollowUpEmail} from "./template";
import type {FollowUpCategory} from "./types";

export async function submitFollowUpEmail(input: {
  id: string;
  recipient: string;
  category: FollowUpCategory;
  language: "en" | "es";
  subject: string;
  message: string;
  actionUrl: string;
  messagesUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return {kind: "NOT_CONFIGURED" as const};
  const email = renderFollowUpEmail(input);
  try {
    const result = await new Resend(apiKey).emails.send({
      from, to: input.recipient, ...email,
      replyTo: configuredReplyTo(from, process.env.EMAIL_REPLY_TO),
    }, {idempotencyKey: `weightpilot-follow-up-${input.id}`, signal: AbortSignal.timeout(20_000)});
    if (result.error) return {kind: "REJECTED" as const};
    return result.data?.id ? {kind: "ACCEPTED" as const, providerMessageId: result.data.id} : {kind: "UNCERTAIN" as const};
  } catch {
    return {kind: "UNCERTAIN" as const};
  }
}
