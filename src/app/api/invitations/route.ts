import {createInvitation} from "@/features/invitations/server";
import {assertTrustedMutationOrigin} from "@/features/invitations/security";
import {getInvitationApiUser, invitationApiError} from "@/features/invitations/api";

export async function POST(request: Request) {
  try {
    assertTrustedMutationOrigin(request);
    const currentUser = await getInvitationApiUser(request);
    if (!currentUser) return invitationApiError("UNAUTHORISED", 401);
    const created = await createInvitation(currentUser.id);
    return Response.json({
      invitation: {
        id: created.id,
        code: created.code,
        codePreview: created.codePreview,
        createdAt: created.createdAt.toISOString(),
        expiresAt: created.expiresAt.toISOString(),
        redeemedAt: null,
        revokedAt: null,
        redemptionType: null,
        status: created.status,
      },
    }, {status: 201});
  } catch (error) {
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return invitationApiError("UNTRUSTED_ORIGIN", 403);
    return invitationApiError("INVITATION_CREATE_FAILED", 500);
  }
}
