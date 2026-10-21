import {getQuestionnaireAdminApiUser, questionnaireApiError, questionnaireApiSuccess} from "@/features/questionnaire/api";
import {getAdminRequest, updateTreatmentRequest} from "@/features/treatments/server";
import {updateTreatmentRequestSchema} from "@/features/treatments/validation";
import {notifyTreatmentRequest} from "@/features/treatments/email";
import {assertTrustedMutationOrigin} from "@/lib/request-security";

export async function PATCH(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    assertTrustedMutationOrigin(request);
    const admin = await getQuestionnaireAdminApiUser(request);
    if (!admin) return questionnaireApiError("REQUEST_FORBIDDEN", 403);
    const {id} = await params;
    let body: unknown;
    try { body = await request.json(); } catch { return questionnaireApiError("REQUEST_INVALID", 422); }
    const parsed = updateTreatmentRequestSchema.safeParse(body);
    if (!parsed.success) return questionnaireApiError("REQUEST_INVALID", 422);
    const result = await updateTreatmentRequest(admin.id, id, parsed.data);
    if (result.changed) {
      try {
        const detail = await getAdminRequest(id);
        if (detail) await notifyTreatmentRequest({id, language: detail.request.language, recipient: detail.memberEmail, target: "member", event: result.request.status});
      } catch { /* Do not roll back or misreport a committed status update. */ }
    }
    return questionnaireApiSuccess({status: result.request.status});
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "UNTRUSTED_ORIGIN" || code === "REQUEST_FORBIDDEN") return questionnaireApiError(code, 403);
    if (code === "REQUEST_NOT_FOUND") return questionnaireApiError(code, 404);
    if (code === "REQUEST_INVALID_TRANSITION") return questionnaireApiError(code, 409);
    return questionnaireApiError("REQUEST_SAVE_FAILED", 500);
  }
}
