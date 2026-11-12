import {adminApiError, adminApiSuccess, getAdminApiUser} from "@/features/admin/api";
import {updateFollowUpOptOut} from "@/features/follow-ups/server";
import {followUpOptOutSchema} from "@/features/follow-ups/validation";
import {assertTrustedMutationOrigin} from "@/lib/request-security";

export async function PATCH(request: Request) {
  try {
    assertTrustedMutationOrigin(request);
    const admin = await getAdminApiUser(request);
    if (!admin) return adminApiError("UNAUTHORISED", 401);
    const parsed = followUpOptOutSchema.safeParse(await request.json());
    if (!parsed.success) return adminApiError("FOLLOW_UP_INVALID", 422);
    const updated = await updateFollowUpOptOut(admin.id, parsed.data.memberId, parsed.data.doNotRemind);
    return updated ? adminApiSuccess({doNotRemind: parsed.data.doNotRemind}) : adminApiError("MEMBER_NOT_FOUND", 404);
  } catch (error) {
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return adminApiError("UNTRUSTED_ORIGIN", 403);
    return adminApiError("FOLLOW_UP_FAILED", 500);
  }
}
