import {getQuestionnaireApiUser, questionnaireApiError, questionnaireApiSuccess} from "@/features/questionnaire/api";
import {getAdminNavigationCounts, getMemberNavigationCounts} from "@/features/notifications/server";

export async function GET(request: Request) {
  const actor = await getQuestionnaireApiUser(request);
  if (!actor) return questionnaireApiError("UNAUTHORISED", 401);
  try {
    return questionnaireApiSuccess(actor.role === "ADMIN" ? await getAdminNavigationCounts(actor.id) : await getMemberNavigationCounts(actor.id));
  } catch {
    return questionnaireApiError("NOTIFICATION_COUNT_UNAVAILABLE", 500);
  }
}
