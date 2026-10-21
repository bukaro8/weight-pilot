import {getQuestionnaireAdminApiUser, questionnaireApiError, questionnaireApiSuccess} from "@/features/questionnaire/api";
import {getAdminRequest, recordApprovalEmailAccepted, updateTreatmentRequest} from "@/features/treatments/server";
import {treatmentDecisionSchema} from "@/features/treatments/validation";
import {notifyTreatmentRequest, sendTreatmentApprovalEmail} from "@/features/treatments/email";
import {assertTrustedMutationOrigin} from "@/lib/request-security";

export async function PATCH(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    assertTrustedMutationOrigin(request);
    const admin = await getQuestionnaireAdminApiUser(request);
    if (!admin) return questionnaireApiError("REQUEST_FORBIDDEN", 403);
    const {id} = await params;
    let body: unknown;
    try { body = await request.json(); } catch { return questionnaireApiError("REQUEST_INVALID", 422); }
    const parsed = treatmentDecisionSchema.safeParse(body);
    if (!parsed.success) return questionnaireApiError("REQUEST_INVALID", 422);
    const result = await updateTreatmentRequest(admin.id, id, parsed.data);
    let approvalEmailFailure: string | null = null;
    try {
      const detail = await getAdminRequest(id);
      if (result.request.status === "APPROVED_FOR_NEXT_STEPS") {
        if (!detail) return questionnaireApiSuccess({status: result.request.status, emailAccepted: false, emailFailure: "UNCERTAIN"});
        if (!detail.emailVerified) return questionnaireApiSuccess({status: result.request.status, emailAccepted: false, emailFailure: "NOT_VERIFIED"});
        if (!result.request.approvedTreatment || !result.request.approvedStrength) return questionnaireApiSuccess({status: result.request.status, emailAccepted: false, emailFailure: "REJECTED"});
        if (result.request.approvalEmailAcceptedAt) return questionnaireApiSuccess({status: result.request.status, emailAccepted: true, alreadySent: true});
        const delivery = await sendTreatmentApprovalEmail({
          id,
          language: detail.request.language,
          recipient: detail.memberEmail,
          memberName: detail.memberName,
          treatment: result.request.approvedTreatment,
          strength: result.request.approvedStrength,
        });
        if (delivery.accepted && delivery.providerMessageId) {
          try {
            await recordApprovalEmailAccepted(admin.id, id, delivery.providerMessageId);
          } catch {
            return questionnaireApiSuccess({status: result.request.status, emailAccepted: false, emailFailure: "UNCERTAIN"});
          }
        }
        return questionnaireApiSuccess({status: result.request.status, emailAccepted: delivery.accepted, emailFailure: delivery.reason});
      }
      if (detail && result.changed) await notifyTreatmentRequest({id, language: detail.request.language, recipient: detail.memberEmail, target: "member", event: result.request.status});
    } catch { approvalEmailFailure = "UNCERTAIN"; /* The status is already committed; the admin can retry email submission. */ }
    if (result.request.status === "APPROVED_FOR_NEXT_STEPS") {
      return questionnaireApiSuccess({status: result.request.status, emailAccepted: false, emailFailure: approvalEmailFailure ?? "UNCERTAIN"});
    }
    return questionnaireApiSuccess({status: result.request.status});
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "UNTRUSTED_ORIGIN" || code === "REQUEST_FORBIDDEN") return questionnaireApiError(code, 403);
    if (code === "REQUEST_NOT_FOUND") return questionnaireApiError(code, 404);
    if (code === "REQUEST_INVALID_TRANSITION") return questionnaireApiError(code, 409);
    if (code === "REQUEST_ALREADY_FINAL") return questionnaireApiError(code, 409);
    return questionnaireApiError("REQUEST_SAVE_FAILED", 500);
  }
}
