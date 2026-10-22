import {z} from "zod";
import {getQuestionnaireApiUser, questionnaireApiError, questionnaireApiSuccess} from "@/features/questionnaire/api";
import {markAdminRequestViewed, markMemberReportViewed, markMemberRequestViewed} from "@/features/notifications/server";
import {assertTrustedMutationOrigin} from "@/lib/request-security";

const schema = z.discriminatedUnion("kind", [
  z.object({kind: z.literal("report"), id: z.uuid()}),
  z.object({kind: z.literal("memberRequest"), id: z.uuid(), expectedStatus: z.enum(["SUBMITTED", "UNDER_REVIEW", "APPROVED_FOR_NEXT_STEPS", "DECLINED", "CANCELLED"])}),
  z.object({kind: z.literal("adminRequest"), id: z.uuid()}),
]);

export async function POST(request: Request) {
  try { assertTrustedMutationOrigin(request); }
  catch { return questionnaireApiError("UNTRUSTED_ORIGIN", 403); }
  const actor = await getQuestionnaireApiUser(request);
  if (!actor) return questionnaireApiError("UNAUTHORISED", 401);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return questionnaireApiError("INVALID_NOTIFICATION", 400);
  if ((actor.role === "ADMIN") !== (parsed.data.kind === "adminRequest")) return questionnaireApiError("FORBIDDEN", 403);
  try {
    const viewed = parsed.data.kind === "report" ? await markMemberReportViewed(actor.id, parsed.data.id)
      : parsed.data.kind === "memberRequest" ? await markMemberRequestViewed(actor.id, parsed.data.id, parsed.data.expectedStatus)
      : await markAdminRequestViewed(parsed.data.id);
    return viewed ? questionnaireApiSuccess({viewed: true}) : questionnaireApiError("NOT_FOUND", 404);
  } catch {
    return questionnaireApiError("NOTIFICATION_VIEW_UNAVAILABLE", 500);
  }
}
