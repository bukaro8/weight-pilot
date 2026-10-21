import {adminApiError, adminApiSuccess, getAdminApiUser} from "@/features/admin/api";
import {markAdminConversationRead} from "@/features/messages/server";
import {conversationIdSchema} from "@/features/messages/validation";
import {assertTrustedMutationOrigin} from "@/lib/request-security";

export async function POST(request: Request, context: {params: Promise<{conversationId: string}>}) {
  try {
    assertTrustedMutationOrigin(request);
    const admin = await getAdminApiUser(request);
    if (!admin) return adminApiError("UNAUTHORISED", 401);
    const {conversationId} = await context.params;
    if (!conversationIdSchema.safeParse(conversationId).success) return adminApiError("CONVERSATION_NOT_FOUND", 404);
    await markAdminConversationRead(conversationId, admin.id);
    return adminApiSuccess({ok: true});
  } catch (error) {
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return adminApiError("UNTRUSTED_ORIGIN", 403);
    return adminApiError("MESSAGE_READ_FAILED", 500);
  }
}
