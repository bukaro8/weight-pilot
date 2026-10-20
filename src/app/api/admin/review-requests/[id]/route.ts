import {updateReviewRequestStatus} from "@/features/assessment/server";
import {reviewRequestIdSchema, reviewStatusUpdateSchema} from "@/features/assessment/validation";
import {adminApiError, adminApiSuccess, getAdminApiUser} from "@/features/admin/api";
import {assertTrustedMutationOrigin} from "@/lib/request-security";

export async function PATCH(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    assertTrustedMutationOrigin(request);
    const currentUser = await getAdminApiUser(request);
    if (!currentUser) return adminApiError("UNAUTHORISED", 401);
    const parsed = reviewStatusUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return adminApiError("REVIEW_STATUS_INVALID", 422);
    const {id} = await params;
    if (!reviewRequestIdSchema.safeParse(id).success) return adminApiError("REVIEW_REQUEST_NOT_FOUND", 404);
    const reviewRequest = await updateReviewRequestStatus(currentUser.id, id, parsed.data.status);
    if (!reviewRequest) return adminApiError("REVIEW_REQUEST_NOT_FOUND", 404);
    return adminApiSuccess({reviewRequest});
  } catch (error) {
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return adminApiError("UNTRUSTED_ORIGIN", 403);
    return adminApiError("REVIEW_STATUS_UPDATE_FAILED", 500);
  }
}
