import {getAdminApiUser, adminApiError, adminApiSuccess} from "@/features/admin/api";
import {PricingConfigurationError, updatePricing} from "@/features/pricing/server";
import {pricingUpdateSchema} from "@/features/pricing/validation";
import {assertTrustedMutationOrigin} from "@/lib/request-security";

export async function PUT(request: Request) {
  try {
    assertTrustedMutationOrigin(request);
    const currentUser = await getAdminApiUser(request);
    if (!currentUser) return adminApiError("UNAUTHORISED", 401);
    const parsed = pricingUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return adminApiError("PRICING_INVALID", 422);
    return adminApiSuccess(await updatePricing(currentUser.id, parsed.data));
  } catch (error) {
    if (error instanceof PricingConfigurationError) return adminApiError("PRICING_NOT_INITIALISED", 409);
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return adminApiError("UNTRUSTED_ORIGIN", 403);
    return adminApiError("PRICING_UPDATE_FAILED", 500);
  }
}
