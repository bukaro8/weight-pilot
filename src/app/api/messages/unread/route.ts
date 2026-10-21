import {getQuestionnaireApiUser, questionnaireApiError, questionnaireApiSuccess} from "@/features/questionnaire/api";
import {countMemberUnreadMessages} from "@/features/messages/server";

export async function GET(request: Request) {
  const actor = await getQuestionnaireApiUser(request);
  if (!actor || actor.role !== "USER") return questionnaireApiError("UNAUTHORISED", 401);
  try { return questionnaireApiSuccess({count: await countMemberUnreadMessages(actor.id)}); }
  catch { return questionnaireApiError("MESSAGE_COUNT_UNAVAILABLE", 500); }
}
