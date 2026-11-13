import {getAdminApiUser, adminApiError, adminApiSuccess} from "@/features/admin/api";
import {buildTreatmentCommunication} from "@/features/treatments/communications";
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
    const prepared = await buildTreatmentCommunication(admin.id, id, parsed.data);
    return adminApiSuccess({recipient: prepared.recipient, subject: prepared.content.subject, html: prepared.content.html, snapshot: prepared.snapshot});
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "UNTRUSTED_ORIGIN" || code === "REQUEST_FORBIDDEN") return adminApiError(code, 403);
    if (code === "REQUEST_NOT_FOUND") return adminApiError(code, 404);
    if (["REQUEST_NOT_APPROVED", "MEMBER_NOT_VERIFIED", "SUPPLY_AUTHORISATION_REQUIRED", "BANK_DETAILS_NOT_CONFIGURED", "STRENGTH_PRICE_MISSING", "EMAIL_NOT_CONFIGURED"].includes(code)) return adminApiError(code, 409);
    return adminApiError("EMAIL_PREVIEW_FAILED", 500);
  }
}
