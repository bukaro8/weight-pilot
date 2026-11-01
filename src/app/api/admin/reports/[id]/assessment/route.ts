import {adminApiError, adminApiSuccess, getAdminApiUser} from "@/features/admin/api";
import {requestStructuredAssessment} from "@/features/reports/openai-assessment";
import {getReportWorkspace, ReportError} from "@/features/reports/server";
import {StructuredAssessmentError} from "@/features/reports/structured-assessment";
import {reportIdSchema} from "@/features/reports/validation";
import {assertTrustedMutationOrigin} from "@/lib/request-security";

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    assertTrustedMutationOrigin(request);
    const admin = await getAdminApiUser(request);
    if (!admin) return adminApiError("UNAUTHORISED", 401);
    const {id} = await params;
    if (!reportIdSchema.safeParse(id).success) return adminApiError("REPORT_NOT_FOUND", 404);
    const workspace = await getReportWorkspace(id);
    if (workspace.report.sendStatus !== "DRAFT" && !(workspace.report.sendStatus === "FAILED" && !workspace.report.providerMessageId)) {
      return adminApiError("REPORT_LOCKED", 409);
    }
    const assessment = await requestStructuredAssessment(workspace.prompt, admin.id);
    // The administrator must inspect/edit this result and explicitly confirm
    // sending through the existing report endpoint. No automatic persistence.
    return adminApiSuccess({assessment});
  } catch (error) {
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return adminApiError("UNTRUSTED_ORIGIN", 403);
    if (error instanceof ReportError) return adminApiError(error.code, error.code === "REPORT_NOT_FOUND" ? 404 : 409);
    if (error instanceof StructuredAssessmentError) {
      const status = error.code === "OPENAI_RATE_LIMITED" ? 429 : error.code === "OPENAI_NOT_CONFIGURED" ? 503 : error.code === "OPENAI_TIMEOUT" ? 504 : 502;
      return adminApiError(error.code, status);
    }
    return adminApiError("OPENAI_UNAVAILABLE", 503);
  }
}
