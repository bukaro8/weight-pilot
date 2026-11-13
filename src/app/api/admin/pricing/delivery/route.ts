import {getAdminApiUser, adminApiError, adminApiSuccess} from "@/features/admin/api";
import {updateDeliveryPricing} from "@/features/pricing/server";
import {deliveryOnlyUpdateSchema} from "@/features/pricing/validation";
import {assertTrustedMutationOrigin} from "@/lib/request-security";

export async function PUT(request: Request) {
  try {
    assertTrustedMutationOrigin(request);
    const admin = await getAdminApiUser(request);
    if (!admin) return adminApiError("UNAUTHORISED", 401);
    const parsed = deliveryOnlyUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return adminApiError("PRICING_INVALID", 422);
    return adminApiSuccess(await updateDeliveryPricing(admin.id, parsed.data));
  } catch (error) {
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return adminApiError("UNTRUSTED_ORIGIN", 403);
    return adminApiError("PRICING_UPDATE_FAILED", 500);
  }
}
