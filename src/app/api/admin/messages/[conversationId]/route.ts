import {adminApiError, adminApiSuccess, getAdminApiUser} from "@/features/admin/api";
import {enforceMessageSendLimit, MessageRateLimitError} from "@/features/messages/security";
import {getAdminConversation, sendAdminMessage} from "@/features/messages/server";
import {conversationIdSchema, privateMessageSchema} from "@/features/messages/validation";
import {assertTrustedMutationOrigin} from "@/lib/request-security";

type Context = {params: Promise<{conversationId: string}>};

export async function GET(request: Request, context: Context) {
  const admin = await getAdminApiUser(request);
  if (!admin) return adminApiError("UNAUTHORISED", 401);
  try {
    const {conversationId} = await context.params;
    if (!conversationIdSchema.safeParse(conversationId).success) return adminApiError("CONVERSATION_NOT_FOUND", 404);
    const conversation = await getAdminConversation(conversationId, admin.id);
    return conversation ? adminApiSuccess({conversation}) : adminApiError("CONVERSATION_NOT_FOUND", 404);
  } catch { return adminApiError("MESSAGES_UNAVAILABLE", 500); }
}

export async function POST(request: Request, context: Context) {
  try {
    assertTrustedMutationOrigin(request);
    const admin = await getAdminApiUser(request);
    if (!admin) return adminApiError("UNAUTHORISED", 401);
    const {conversationId} = await context.params;
    if (!conversationIdSchema.safeParse(conversationId).success) return adminApiError("CONVERSATION_NOT_FOUND", 404);
    let payload: unknown;
    try { payload = await request.json(); } catch { return adminApiError("MESSAGE_INVALID", 422); }
    const parsed = privateMessageSchema.safeParse(payload);
    if (!parsed.success) return adminApiError("MESSAGE_INVALID", 422);
    await enforceMessageSendLimit(admin.id);
    const result = await sendAdminMessage(admin, conversationId, parsed.data);
    return adminApiSuccess({message: result.message}, result.created ? 201 : 200);
  } catch (error) {
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return adminApiError("UNTRUSTED_ORIGIN", 403);
    if (error instanceof MessageRateLimitError) return adminApiError("MESSAGE_RATE_LIMITED", 429);
    if (error instanceof Error && error.message === "MESSAGE_ACCESS_DENIED") return adminApiError("UNAUTHORISED", 401);
    if (error instanceof Error && error.message === "MESSAGE_CONVERSATION_NOT_FOUND") return adminApiError("CONVERSATION_NOT_FOUND", 404);
    if (error instanceof Error && error.message === "MESSAGE_IDEMPOTENCY_CONFLICT") return adminApiError("MESSAGE_CONFLICT", 409);
    return adminApiError("MESSAGE_SEND_FAILED", 500);
  }
}
