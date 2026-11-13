import {getAdminApiUser, adminApiError, adminApiSuccess} from "@/features/admin/api";
import {sendTreatmentPaymentEmail} from "@/features/treatments/email";
import {paymentEnvironmentConfigured} from "@/features/treatments/payment";
import {claimTreatmentPaymentInstruction, recordTreatmentPaymentResult} from "@/features/treatments/server";
import {paymentAuthorisationSchema} from "@/features/treatments/validation";
import {assertTrustedMutationOrigin} from "@/lib/request-security";
import {publicInvitationOrigin} from "@/features/invitations/sharing";

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    assertTrustedMutationOrigin(request);
    const admin = await getAdminApiUser(request);
    if (!admin) return adminApiError("REQUEST_FORBIDDEN", 403);
    const parsed = paymentAuthorisationSchema.safeParse(await request.json());
    if (!parsed.success) return adminApiError("PAYMENT_AUTHORISATION_REQUIRED", 422);
    if (!paymentEnvironmentConfigured({accountName: process.env.ACCOUNT_NAME, sortCode: process.env.SORT_CODE, accountNumber: process.env.ACCOUNT_NUMBER})) return adminApiError("BANK_DETAILS_NOT_CONFIGURED", 409);
    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !publicInvitationOrigin(process.env.PUBLIC_APP_URL)) return adminApiError("EMAIL_NOT_CONFIGURED", 409);
    const {id} = await params;
    const claimed = await claimTreatmentPaymentInstruction(admin.id, id, parsed.data);
    const result = await sendTreatmentPaymentEmail({id, ...claimed});
    try {
      await recordTreatmentPaymentResult(id, result.accepted && result.providerMessageId
        ? {status: "ACCEPTED", providerMessageId: result.providerMessageId}
        : {status: result.reason === "REJECTED" ? "FAILED" : "UNCERTAIN", failureCode: result.reason ?? "UNCERTAIN"});
    } catch {
      return adminApiError("PAYMENT_SUBMISSION_UNCERTAIN", 503);
    }
    if (result.accepted) return adminApiSuccess({sendStatus: "ACCEPTED"});
    return adminApiError(result.reason === "REJECTED" ? "PAYMENT_EMAIL_REJECTED" : "PAYMENT_SUBMISSION_UNCERTAIN", 503);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "UNTRUSTED_ORIGIN" || code === "REQUEST_FORBIDDEN") return adminApiError(code, 403);
    if (["REQUEST_NOT_APPROVED", "MEMBER_NOT_VERIFIED", "STRENGTH_PRICE_MISSING", "PAYMENT_ALREADY_SENT", "PAYMENT_ATTEMPT_EXISTS"].includes(code)) return adminApiError(code, 409);
    return adminApiError("PAYMENT_PREPARATION_FAILED", 500);
  }
}
