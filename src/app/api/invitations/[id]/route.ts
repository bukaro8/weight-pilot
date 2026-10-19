import {assertTrustedMutationOrigin} from "@/features/invitations/security";
import {revokeInvitation} from "@/features/invitations/server";
import {getInvitationApiUser, invitationApiError} from "@/features/invitations/api";

export async function DELETE(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    assertTrustedMutationOrigin(request);
    const currentUser = await getInvitationApiUser(request);
    if (!currentUser) return invitationApiError("UNAUTHORISED", 401);
    const {id} = await params;
    const revoked = await revokeInvitation(id, {id: currentUser.id, role: currentUser.role});
    if (!revoked) return invitationApiError("INVITATION_NOT_REVOCABLE", 409);
    return Response.json({success: true});
  } catch (error) {
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return invitationApiError("UNTRUSTED_ORIGIN", 403);
    return invitationApiError("INVITATION_REVOKE_FAILED", 500);
  }
}
