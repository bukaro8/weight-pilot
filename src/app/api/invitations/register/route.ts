import {auth} from "@/features/auth/server";
import {invitationApiError} from "@/features/invitations/api";
import {InvitationError, registerWithInvitation} from "@/features/invitations/server";
import {assertTrustedMutationOrigin, enforceInvitationRedemptionLimit, InvitationRateLimitError} from "@/features/invitations/security";
import {invitationRegistrationSchema} from "@/features/invitations/validation";

export async function POST(request: Request) {
  try {
    assertTrustedMutationOrigin(request);
    const body: unknown = await request.json();
    const parsed = invitationRegistrationSchema.safeParse(body);
    if (!parsed.success) return invitationApiError("INVALID_REGISTRATION", 422);
    await enforceInvitationRedemptionLimit(request, parsed.data.email);
    const registered = await registerWithInvitation(parsed.data);
    await auth.api.sendVerificationEmail({
      body: {
        email: registered.email,
        callbackURL: `/${parsed.data.preferredLanguage}/verify-email?verified=1`,
      },
      headers: request.headers,
    });
    return Response.json({success: true}, {status: 201});
  } catch (error) {
    if (error instanceof InvitationRateLimitError) return invitationApiError("INVITATION_RATE_LIMITED", 429);
    if (error instanceof InvitationError) return invitationApiError("REGISTRATION_FAILED", 400);
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return invitationApiError("UNTRUSTED_ORIGIN", 403);
    return invitationApiError("REGISTRATION_FAILED", 400);
  }
}
