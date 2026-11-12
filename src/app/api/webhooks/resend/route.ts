import {Resend} from "resend";

import {applyResendDeliveryEvent} from "@/features/reports/server";
import {applyFollowUpDeliveryEvent} from "@/features/follow-ups/server";

export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) return Response.json({error: "WEBHOOK_NOT_CONFIGURED"}, {status: 503});
  const payload = await request.text();
  let event;
  try {
    event = new Resend().webhooks.verify({
      payload,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
      webhookSecret,
    });
  } catch {
    return Response.json({error: "INVALID_SIGNATURE"}, {status: 401});
  }
  try {
    if ("email_id" in event.data && ["email.delivered", "email.failed", "email.bounced", "email.suppressed", "email.complained"].includes(event.type)) {
      await applyResendDeliveryEvent({type: event.type, providerMessageId: event.data.email_id});
      await applyFollowUpDeliveryEvent({type: event.type, providerMessageId: event.data.email_id});
    }
    return Response.json({received: true});
  } catch {
    return Response.json({error: "DELIVERY_EVENT_FAILED"}, {status: 500});
  }
}
