import {getAdminApiUser, adminApiError, adminApiSuccess} from "@/features/admin/api";
import {claimTreatmentCommunication, recordTreatmentCommunicationResult, submitTreatmentCommunication} from "@/features/treatments/communications";
import {treatmentCommunicationSchema} from "@/features/treatments/validation";
import {assertTrustedMutationOrigin} from "@/lib/request-security";

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    assertTrustedMutationOrigin(request);
    const admin = await getAdminApiUser(request);
    if (!admin) return adminApiError("REQUEST_FORBIDDEN", 403);
    const parsed = treatmentCommunicationSchema.safeParse(await request.json());
    if (!parsed.success) return adminApiError("EMAIL_INVALID", 422);
    const {id} = await params;
    const claimed = await claimTreatmentCommunication(admin.id, id, parsed.data);
    const result = await submitTreatmentCommunication(claimed.id, claimed.recipient, claimed.content);
    try {await recordTreatmentCommunicationResult(claimed.id, result);} catch {return adminApiError("EMAIL_SUBMISSION_UNCERTAIN", 503);}
    if (result.status === "ACCEPTED") return adminApiSuccess({id: claimed.id, status: "ACCEPTED"});
    return adminApiError(result.status === "FAILED" ? "EMAIL_PROVIDER_REJECTED" : "EMAIL_SUBMISSION_UNCERTAIN", 503);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "UNTRUSTED_ORIGIN" || code === "REQUEST_FORBIDDEN") return adminApiError(code, 403);
    if (code === "REQUEST_NOT_FOUND") return adminApiError(code, 404);
    if (["REQUEST_NOT_APPROVED", "MEMBER_NOT_VERIFIED", "SUPPLY_AUTHORISATION_REQUIRED", "BANK_DETAILS_NOT_CONFIGURED", "STRENGTH_PRICE_MISSING", "EMAIL_NOT_CONFIGURED", "EMAIL_ALREADY_QUEUED", "PRICE_CHANGED_REPREVIEW", "RECIPIENT_CHANGED"].includes(code)) return adminApiError(code, 409);
    return adminApiError("EMAIL_PREPARATION_FAILED", 500);
  }
}
