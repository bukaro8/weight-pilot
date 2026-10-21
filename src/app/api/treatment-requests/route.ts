import {getQuestionnaireApiUser, questionnaireApiError, questionnaireApiSuccess} from "@/features/questionnaire/api";
import {createTreatmentRequest, getActiveAdministrator} from "@/features/treatments/server";
import {createTreatmentRequestSchema} from "@/features/treatments/validation";
import {enforceTreatmentRequestLimit} from "@/features/treatments/security";
import {notifyTreatmentRequest} from "@/features/treatments/email";
import {assertTrustedMutationOrigin} from "@/lib/request-security";

export async function POST(request: Request) {
  try {
    assertTrustedMutationOrigin(request);
    const member = await getQuestionnaireApiUser(request);
    if (!member || member.role !== "USER") return questionnaireApiError("REQUEST_FORBIDDEN", 403);
    let body: unknown;
    try { body = await request.json(); } catch { return questionnaireApiError("REQUEST_INVALID", 422); }
    const parsed = createTreatmentRequestSchema.safeParse(body);
    if (!parsed.success) return questionnaireApiError("REQUEST_INVALID", 422);
    await enforceTreatmentRequestLimit(member.id);
    const result = await createTreatmentRequest(member.id, parsed.data);
    if (result.created) {
      try {
        const admin = await getActiveAdministrator();
        if (admin) await notifyTreatmentRequest({id: result.request.id, language: admin.preferredLanguage, recipient: admin.email, target: "admin", event: "created"});
      } catch { /* The saved request remains authoritative if an optional notification fails. */ }
    }
    return questionnaireApiSuccess({id: result.request.id, created: result.created}, result.created ? 201 : 200);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "UNTRUSTED_ORIGIN") return questionnaireApiError(code, 403);
    if (code === "REQUEST_FORBIDDEN") return questionnaireApiError(code, 403);
    if (code === "REQUEST_CONFLICT") return questionnaireApiError(code, 409);
    if (code === "REQUEST_RATE_LIMITED") return questionnaireApiError(code, 429);
    return questionnaireApiError("REQUEST_SAVE_FAILED", 500);
  }
}
