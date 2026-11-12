import {adminApiError, adminApiSuccess, getAdminApiUser} from "@/features/admin/api";
import {sendManualFollowUp} from "@/features/follow-ups/server";
import {followUpSendSchema} from "@/features/follow-ups/validation";
import {assertTrustedMutationOrigin} from "@/lib/request-security";

export async function POST(request: Request) {
  try {
    assertTrustedMutationOrigin(request);
    const admin = await getAdminApiUser(request);
    if (!admin) return adminApiError("UNAUTHORISED", 401);
    const parsed = followUpSendSchema.safeParse(await request.json());
    if (!parsed.success) return adminApiError("FOLLOW_UP_INVALID", 422);
    const result = await sendManualFollowUp(admin.id, parsed.data);
    if (result.kind === "INELIGIBLE" || result.kind === "OPTED_OUT") return adminApiError(result.kind, 403);
    if (result.kind === "RATE_LIMITED") return adminApiError(result.kind, 429);
    if (result.kind === "NOT_CONFIGURED") return adminApiError(result.kind, 503);
    if (result.kind === "RECENT_CONFIRMATION_REQUIRED" || result.kind === "RECENT_DUPLICATE") return adminApiError(result.kind, 409);
    if (result.kind === "FAILED") return adminApiError("PROVIDER_REJECTED", 502);
    if (result.kind === "UNCERTAIN") return adminApiError("DELIVERY_UNCERTAIN", 503);
    if (result.kind === "ALREADY_PROCESSED" && !["ACCEPTED", "DELIVERED"].includes(result.status ?? "")) {
      return adminApiError(result.status === "FAILED" ? "PROVIDER_REJECTED" : "DELIVERY_UNCERTAIN", 409);
    }
    return adminApiSuccess(result);
  } catch (error) {
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return adminApiError("UNTRUSTED_ORIGIN", 403);
    return adminApiError("FOLLOW_UP_FAILED", 500);
  }
}
