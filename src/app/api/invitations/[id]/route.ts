import {assertTrustedMutationOrigin} from "@/features/invitations/security";
import {revokeInvitation} from "@/features/invitations/server";
import {adminApiError} from "@/features/admin/api";
import {canAccessPrivateServices} from "@/features/auth/policy";
import {getAuthoritativeUser} from "@/lib/authorization";

export async function DELETE(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    assertTrustedMutationOrigin(request);
    const currentUser = await getAuthoritativeUser(request.headers);
    if (!currentUser || !canAccessPrivateServices(currentUser)) return adminApiError("UNAUTHORISED", 401);
    const {id} = await params;
    const revoked = await revokeInvitation(id, {id: currentUser.id, role: currentUser.role});
    if (!revoked) return adminApiError("INVITATION_NOT_REVOCABLE", 409);
    return Response.json({success: true});
  } catch (error) {
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return adminApiError("UNTRUSTED_ORIGIN", 403);
    return adminApiError("INVITATION_REVOKE_FAILED", 500);
  }
}
