import {invitationApiError} from "@/features/invitations/api";
import {InvitationError, reactivateWithInvitation} from "@/features/invitations/server";
import {assertTrustedMutationOrigin, enforceInvitationRedemptionLimit, InvitationRateLimitError} from "@/features/invitations/security";
import {invitationReactivationSchema} from "@/features/invitations/validation";

export async function POST(request: Request) {
  try {
    assertTrustedMutationOrigin(request);
    const body: unknown = await request.json();
    const parsed = invitationReactivationSchema.safeParse(body);
    if (!parsed.success) return invitationApiError("INVALID_REACTIVATION", 422);
    await enforceInvitationRedemptionLimit(request, parsed.data.email);
    await reactivateWithInvitation(parsed.data);
    return Response.json({success: true});
  } catch (error) {
    if (error instanceof InvitationRateLimitError) return invitationApiError("INVITATION_RATE_LIMITED", 429);
    if (error instanceof InvitationError) return invitationApiError(error.code, 400);
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return invitationApiError("UNTRUSTED_ORIGIN", 403);
    return invitationApiError("REACTIVATION_FAILED", 400);
  }
}
