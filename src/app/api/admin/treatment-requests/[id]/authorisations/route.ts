import {getAdminApiUser, adminApiError, adminApiSuccess} from "@/features/admin/api";
import {recordSupplyAuthorisation} from "@/features/treatments/communications";
import {paymentAuthorisationSchema} from "@/features/treatments/validation";
import {assertTrustedMutationOrigin} from "@/lib/request-security";

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    assertTrustedMutationOrigin(request);
    const admin = await getAdminApiUser(request);
    if (!admin) return adminApiError("REQUEST_FORBIDDEN", 403);
    const parsed = paymentAuthorisationSchema.safeParse(await request.json());
    if (!parsed.success) return adminApiError("PAYMENT_AUTHORISATION_REQUIRED", 422);
    const {id} = await params;
    return adminApiSuccess(await recordSupplyAuthorisation(admin.id, id, parsed.data), 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "UNTRUSTED_ORIGIN" || code === "REQUEST_FORBIDDEN") return adminApiError(code, 403);
    if (code === "REQUEST_NOT_APPROVED") return adminApiError(code, 409);
    return adminApiError("AUTHORISATION_SAVE_FAILED", 500);
  }
}
