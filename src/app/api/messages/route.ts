import {getQuestionnaireApiUser, questionnaireApiError, questionnaireApiSuccess} from "@/features/questionnaire/api";
import {enforceMessageSendLimit, MessageRateLimitError} from "@/features/messages/security";
import {getMemberConversation, sendMemberMessage} from "@/features/messages/server";
import {privateMessageSchema} from "@/features/messages/validation";
import {assertTrustedMutationOrigin} from "@/lib/request-security";

export async function GET(request: Request) {
  const actor = await getQuestionnaireApiUser(request);
  if (!actor || actor.role !== "USER") return questionnaireApiError("UNAUTHORISED", 401);
  try { return questionnaireApiSuccess(await getMemberConversation(actor.id)); }
  catch { return questionnaireApiError("MESSAGES_UNAVAILABLE", 500); }
}

export async function POST(request: Request) {
  try {
    assertTrustedMutationOrigin(request);
    const actor = await getQuestionnaireApiUser(request);
    if (!actor || actor.role !== "USER") return questionnaireApiError("UNAUTHORISED", 401);
    let payload: unknown;
    try { payload = await request.json(); } catch { return questionnaireApiError("MESSAGE_INVALID", 422); }
    const parsed = privateMessageSchema.safeParse(payload);
    if (!parsed.success) return questionnaireApiError("MESSAGE_INVALID", 422);
    await enforceMessageSendLimit(actor.id);
    const result = await sendMemberMessage(actor, parsed.data);
    return questionnaireApiSuccess({conversationId: result.conversationId, message: result.message}, result.created ? 201 : 200);
  } catch (error) {
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return questionnaireApiError("UNTRUSTED_ORIGIN", 403);
    if (error instanceof MessageRateLimitError) return questionnaireApiError("MESSAGE_RATE_LIMITED", 429);
    if (error instanceof Error && error.message === "MESSAGE_ACCESS_DENIED") return questionnaireApiError("UNAUTHORISED", 401);
    if (error instanceof Error && error.message === "MESSAGE_IDEMPOTENCY_CONFLICT") return questionnaireApiError("MESSAGE_CONFLICT", 409);
    return questionnaireApiError("MESSAGE_SEND_FAILED", 500);
  }
}
