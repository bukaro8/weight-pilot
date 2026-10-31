import {z} from "zod";

import {adminApiError, adminApiSuccess} from "@/features/admin/api";
import {canAccessPrivateServices} from "@/features/auth/policy";
import {sendInvitationEmail} from "@/features/invitations/email";
import {enforceInvitationEmailLimit, InvitationRateLimitError} from "@/features/invitations/security";
import {getOwnedShareableInvitation} from "@/features/invitations/server";
import {invitationRegistrationLink, publicInvitationOrigin} from "@/features/invitations/sharing";
import {invitationEmailSchema} from "@/features/invitations/validation";
import {getAuthoritativeUser} from "@/lib/authorization";
import {assertTrustedMutationOrigin} from "@/lib/request-security";

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    assertTrustedMutationOrigin(request);
    const currentUser = await getAuthoritativeUser(request.headers);
    if (!currentUser || !canAccessPrivateServices(currentUser)) return adminApiError("UNAUTHORISED", 401);
    const {id} = await params;
    if (!z.uuid().safeParse(id).success) return adminApiError("INVITATION_UNAVAILABLE", 404);
    const parsed = invitationEmailSchema.safeParse(await request.json());
    if (!parsed.success) return adminApiError("INVITATION_EMAIL_INVALID", 422);
    const origin = publicInvitationOrigin(process.env.PUBLIC_APP_URL || process.env.BETTER_AUTH_URL);
    if (!origin) return adminApiError("PUBLIC_URL_NOT_CONFIGURED", 503);
    const invitation = await getOwnedShareableInvitation(id, currentUser.id);
    if (!invitation) return adminApiError("INVITATION_UNAVAILABLE", 409);
    await enforceInvitationEmailLimit(currentUser.id);
    const link = invitationRegistrationLink(origin, parsed.data.language, invitation.code);
    const result = await sendInvitationEmail({recipient: parsed.data.email, language: parsed.data.language, link, kind: invitation.kind});
    if (!result.ok) return adminApiError(result.reason, result.reason === "NOT_CONFIGURED" ? 503 : 502);
    return adminApiSuccess({status: "ACCEPTED"});
  } catch (error) {
    if (error instanceof InvitationRateLimitError) return adminApiError("INVITATION_EMAIL_RATE_LIMITED", 429);
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return adminApiError("UNTRUSTED_ORIGIN", 403);
    return adminApiError("INVITATION_EMAIL_FAILED", 500);
  }
}
