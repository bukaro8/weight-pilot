import {adminApiError, adminApiSuccess, getAdminApiUser} from "@/features/admin/api";
import {ReportError, sendReport} from "@/features/reports/server";
import {reportIdSchema, reportSendSchema} from "@/features/reports/validation";
import {assertTrustedMutationOrigin} from "@/lib/request-security";

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    assertTrustedMutationOrigin(request);
    const currentUser = await getAdminApiUser(request);
    if (!currentUser) return adminApiError("UNAUTHORISED", 401);
    const {id} = await params;
    if (!reportIdSchema.safeParse(id).success) return adminApiError("REPORT_NOT_FOUND", 404);
    const confirmation = reportSendSchema.safeParse(await request.json());
    if (!confirmation.success) return adminApiError("SEND_CONFIRMATION_REQUIRED", 422);
    return adminApiSuccess({report: await sendReport(currentUser.id, id)});
  } catch (error) {
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return adminApiError("UNTRUSTED_ORIGIN", 403);
    if (error instanceof ReportError) {
      const status = error.code === "REPORT_NOT_FOUND" ? 404 : error.code === "REPORT_SEND_FAILED" ? 502 : 409;
      return adminApiError(error.code, status);
    }
    return adminApiError("REPORT_SEND_FAILED", 500);
  }
}
