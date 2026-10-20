import {requestPersonalisedReview} from "@/features/assessment/server";
import {reviewRequestSchema} from "@/features/assessment/validation";
import {getQuestionnaireApiUser, questionnaireApiError, questionnaireApiSuccess} from "@/features/questionnaire/api";
import {assertTrustedMutationOrigin} from "@/lib/request-security";
import {notifyAdminOfReviewRequest} from "@/features/reports/server";

export async function POST(request: Request) {
  try {
    assertTrustedMutationOrigin(request);
    const currentUser = await getQuestionnaireApiUser(request);
    if (!currentUser) return questionnaireApiError("UNAUTHORISED", 401);
    const parsed = reviewRequestSchema.safeParse(await request.json());
    if (!parsed.success) return questionnaireApiError("REVIEW_REQUEST_INVALID", 422);
    const result = await requestPersonalisedReview(currentUser.id, parsed.data.questionnaireId, parsed.data.reportLanguage);
    if (!result) return questionnaireApiError("QUESTIONNAIRE_NOT_FOUND", 404);
    if (result.created) await notifyAdminOfReviewRequest(result.reviewRequest.id);
    return questionnaireApiSuccess({reviewRequest: result.reviewRequest});
  } catch (error) {
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return questionnaireApiError("UNTRUSTED_ORIGIN", 403);
    return questionnaireApiError("REVIEW_REQUEST_FAILED", 500);
  }
}
