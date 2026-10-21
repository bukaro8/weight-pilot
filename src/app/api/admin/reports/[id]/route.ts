import {adminApiError, adminApiSuccess, getAdminApiUser} from "@/features/admin/api";
import {getReportWorkspace, ReportError, saveReportDraft} from "@/features/reports/server";
import {reportDraftSchema, reportIdSchema} from "@/features/reports/validation";
import {assertTrustedMutationOrigin} from "@/lib/request-security";

export async function GET(request: Request, {params}: {params: Promise<{id: string}>}) {
  const currentUser = await getAdminApiUser(request);
  if (!currentUser) return adminApiError("UNAUTHORISED", 401);
  const {id} = await params;
  if (!reportIdSchema.safeParse(id).success) return adminApiError("REPORT_NOT_FOUND", 404);
  try {
    const requestedLanguage = new URL(request.url).searchParams.get("language");
    const language = requestedLanguage === "en" || requestedLanguage === "es" ? requestedLanguage : undefined;
    return adminApiSuccess({workspace: await getReportWorkspace(id, language)});
  }
  catch (error) { return adminApiError(error instanceof ReportError ? error.code : "REPORT_LOAD_FAILED", error instanceof ReportError ? 404 : 500); }
}

export async function PUT(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    assertTrustedMutationOrigin(request);
    const currentUser = await getAdminApiUser(request);
    if (!currentUser) return adminApiError("UNAUTHORISED", 401);
    const {id} = await params;
    if (!reportIdSchema.safeParse(id).success) return adminApiError("REPORT_NOT_FOUND", 404);
    const parsed = reportDraftSchema.safeParse(await request.json());
    if (!parsed.success) return adminApiError("REPORT_INVALID", 422);
    const report = await saveReportDraft(currentUser.id, id, parsed.data);
    const workspace = await getReportWorkspace(id);
    return adminApiSuccess({report, prompt: workspace.prompt, previewHtml: workspace.previewHtml});
  } catch (error) {
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return adminApiError("UNTRUSTED_ORIGIN", 403);
    if (error instanceof ReportError) return adminApiError(error.code, error.code === "REPORT_NOT_FOUND" ? 404 : error.code === "REPORT_INVALID_PHARMACY" ? 422 : 409);
    return adminApiError("REPORT_SAVE_FAILED", 500);
  }
}
