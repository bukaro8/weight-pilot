import {getQuestionnaireAdminApiUser, questionnaireApiError, questionnaireApiSuccess} from "@/features/questionnaire/api";
import {claimDecisionNotice, recordTreatmentCommunicationResult, submitTreatmentCommunication} from "@/features/treatments/communications";
import {recordApprovalEmailAccepted, updateTreatmentRequest} from "@/features/treatments/server";
import {treatmentDecisionSchema} from "@/features/treatments/validation";
import {assertTrustedMutationOrigin} from "@/lib/request-security";

export async function PATCH(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    assertTrustedMutationOrigin(request);
    const admin = await getQuestionnaireAdminApiUser(request);
    if (!admin) return questionnaireApiError("REQUEST_FORBIDDEN", 403);
    const {id} = await params;
    let body: unknown;
    try {body = await request.json();} catch {return questionnaireApiError("REQUEST_INVALID", 422);}
    const parsed = treatmentDecisionSchema.safeParse(body);
    if (!parsed.success) return questionnaireApiError("REQUEST_INVALID", 422);
    const result = await updateTreatmentRequest(admin.id, id, parsed.data);
    if (!result.changed && result.request.approvalEmailAcceptedAt) return questionnaireApiSuccess({status: result.request.status, emailAccepted: true, alreadySent: true});
    try {
      const claimed = await claimDecisionNotice(admin.id, id);
      const delivery = await submitTreatmentCommunication(claimed.id, claimed.recipient, claimed.content);
      try {await recordTreatmentCommunicationResult(claimed.id, delivery);} catch {return questionnaireApiSuccess({status: result.request.status, emailAccepted: false, emailFailure: "UNCERTAIN"});}
      if (delivery.status === "ACCEPTED" && delivery.providerMessageId && result.request.status === "APPROVED_FOR_NEXT_STEPS") {
        try {await recordApprovalEmailAccepted(admin.id, id, delivery.providerMessageId);} catch { /* Communication record remains authoritative. */ }
      }
      return questionnaireApiSuccess({status: result.request.status, emailAccepted: delivery.status === "ACCEPTED", emailFailure: delivery.status === "FAILED" ? "REJECTED" : delivery.status === "UNCERTAIN" ? "UNCERTAIN" : null});
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      return questionnaireApiSuccess({status: result.request.status, emailAccepted: false, emailFailure: code === "MEMBER_NOT_VERIFIED" ? "NOT_VERIFIED" : code === "EMAIL_NOT_CONFIGURED" ? "NOT_CONFIGURED" : "UNCERTAIN"});
    }
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "UNTRUSTED_ORIGIN" || code === "REQUEST_FORBIDDEN") return questionnaireApiError(code, 403);
    if (code === "REQUEST_NOT_FOUND") return questionnaireApiError(code, 404);
    if (code === "REQUEST_INVALID_TRANSITION" || code === "REQUEST_ALREADY_FINAL") return questionnaireApiError(code, 409);
    return questionnaireApiError("REQUEST_SAVE_FAILED", 500);
  }
}
