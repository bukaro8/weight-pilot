import {adminApiError, adminApiSuccess, getAdminApiUser} from "@/features/admin/api";
import {PricingConfigurationError, updatePharmacyReferenceData} from "@/features/pricing/server";
import {pharmacyReferenceUpdateSchema} from "@/features/pricing/validation";
import {assertTrustedMutationOrigin} from "@/lib/request-security";

export async function PUT(request: Request) {
  try {
    assertTrustedMutationOrigin(request);
    const currentUser = await getAdminApiUser(request);
    if (!currentUser) return adminApiError("UNAUTHORISED", 401);
    const parsed = pharmacyReferenceUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return adminApiError("PHARMACY_REFERENCE_INVALID", 422);
    return adminApiSuccess(await updatePharmacyReferenceData(currentUser.id, parsed.data));
  } catch (error) {
    if (error instanceof PricingConfigurationError) return adminApiError("PHARMACY_REFERENCE_NOT_INITIALISED", 409);
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return adminApiError("UNTRUSTED_ORIGIN", 403);
    return adminApiError("PHARMACY_REFERENCE_UPDATE_FAILED", 500);
  }
}
