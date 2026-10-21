import {getQuestionnaireApiUser, questionnaireApiError, questionnaireApiSuccess} from "@/features/questionnaire/api";
import {markMemberConversationRead} from "@/features/messages/server";
import {assertTrustedMutationOrigin} from "@/lib/request-security";

export async function POST(request: Request) {
  try {
    assertTrustedMutationOrigin(request);
    const actor = await getQuestionnaireApiUser(request);
    if (!actor || actor.role !== "USER") return questionnaireApiError("UNAUTHORISED", 401);
    await markMemberConversationRead(actor.id);
    return questionnaireApiSuccess({ok: true});
  } catch (error) {
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return questionnaireApiError("UNTRUSTED_ORIGIN", 403);
    return questionnaireApiError("MESSAGE_READ_FAILED", 500);
  }
}
