import {getQuestionnaireApiUser, questionnaireApiError, questionnaireApiSuccess} from "@/features/questionnaire/api";
import {QuestionnaireError, saveQuestionnaireDraft, submitQuestionnaire} from "@/features/questionnaire/server";
import {questionnaireDraftSchema, questionnaireSubmitRequestSchema} from "@/features/questionnaire/validation";
import {assertTrustedMutationOrigin} from "@/lib/request-security";

export async function PATCH(request: Request) {
  try {
    assertTrustedMutationOrigin(request);
    const currentUser = await getQuestionnaireApiUser(request);
    if (!currentUser) return questionnaireApiError("UNAUTHORISED", 401);
    const parsed = questionnaireDraftSchema.safeParse(await request.json());
    if (!parsed.success) return questionnaireApiError("QUESTIONNAIRE_INVALID", 422);
    const saved = await saveQuestionnaireDraft(currentUser.id, parsed.data);
    return questionnaireApiSuccess({questionnaire: saved});
  } catch (error) {
    if (error instanceof QuestionnaireError) return questionnaireApiError(error.code, error.code === "QUESTIONNAIRE_NOT_EDITABLE" ? 409 : 400);
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return questionnaireApiError("UNTRUSTED_ORIGIN", 403);
    return questionnaireApiError("QUESTIONNAIRE_SAVE_FAILED", 500);
  }
}

export async function POST(request: Request) {
  try {
    assertTrustedMutationOrigin(request);
    const currentUser = await getQuestionnaireApiUser(request);
    if (!currentUser) return questionnaireApiError("UNAUTHORISED", 401);
    const parsed = questionnaireSubmitRequestSchema.safeParse(await request.json());
    if (!parsed.success) return questionnaireApiError("QUESTIONNAIRE_INVALID", 422);
    const submitted = await submitQuestionnaire(currentUser.id, parsed.data.questionnaireId);
    return questionnaireApiSuccess({questionnaire: submitted});
  } catch (error) {
    if (error instanceof QuestionnaireError) return questionnaireApiError(error.code, error.code === "QUESTIONNAIRE_NOT_EDITABLE" ? 409 : 422);
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return questionnaireApiError("UNTRUSTED_ORIGIN", 403);
    return questionnaireApiError("QUESTIONNAIRE_SUBMIT_FAILED", 500);
  }
}
