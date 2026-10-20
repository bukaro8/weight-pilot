import {getQuestionnaireAdminApiUser, questionnaireApiError, questionnaireApiSuccess} from "@/features/questionnaire/api";
import {deleteQuestionnaireSubmission} from "@/features/questionnaire/server";
import {assertTrustedMutationOrigin} from "@/lib/request-security";

export async function DELETE(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    assertTrustedMutationOrigin(request);
    const currentUser = await getQuestionnaireAdminApiUser(request);
    if (!currentUser) return questionnaireApiError("UNAUTHORISED", 401);
    const {id} = await params;
    const deleted = await deleteQuestionnaireSubmission(id);
    if (!deleted) return questionnaireApiError("QUESTIONNAIRE_NOT_FOUND", 404);
    return questionnaireApiSuccess({success: true});
  } catch (error) {
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return questionnaireApiError("UNTRUSTED_ORIGIN", 403);
    return questionnaireApiError("QUESTIONNAIRE_DELETE_FAILED", 500);
  }
}
