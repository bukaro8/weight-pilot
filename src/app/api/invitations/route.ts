import {createInvitation} from "@/features/invitations/server";
import {assertTrustedMutationOrigin, enforceInvitationCreationLimit, InvitationRateLimitError} from "@/features/invitations/security";
import {adminApiError} from "@/features/admin/api";
import {canAccessPrivateServices} from "@/features/auth/policy";
import {getAuthoritativeUser} from "@/lib/authorization";
import {z} from "zod";

export async function POST(request: Request) {
  try {
    assertTrustedMutationOrigin(request);
    const currentUser = await getAuthoritativeUser(request.headers);
    if (!currentUser || !canAccessPrivateServices(currentUser)) return adminApiError("UNAUTHORISED", 401);
    const parsed = z.object({kind: z.enum(["STANDARD", "MASTER"]).default("STANDARD")}).strict()
      .safeParse(request.headers.get("content-type")?.includes("application/json") ? await request.json() : {});
    if (!parsed.success) return adminApiError("INVITATION_INVALID", 422);
    if (parsed.data.kind === "MASTER" && currentUser.role !== "ADMIN") return adminApiError("UNAUTHORISED", 403);
    await enforceInvitationCreationLimit(currentUser.id);
    const created = await createInvitation(currentUser.id, parsed.data.kind);
    return Response.json({
      invitation: {
        id: created.id,
        code: created.code,
        codePreview: created.codePreview,
        kind: created.kind,
        usageCount: 0,
        createdAt: created.createdAt.toISOString(),
        expiresAt: created.expiresAt?.toISOString() ?? null,
        redeemedAt: null,
        revokedAt: null,
        redemptionType: null,
        status: created.status,
        creatorName: currentUser.name,
        creatorEmail: currentUser.email,
        creatorRole: currentUser.role,
        redeemerName: null,
        redeemerEmail: null,
      },
    }, {status: 201});
  } catch (error) {
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return adminApiError("UNTRUSTED_ORIGIN", 403);
    if (error instanceof InvitationRateLimitError) return adminApiError("INVITATION_CREATE_RATE_LIMITED", 429);
    return adminApiError("INVITATION_CREATE_FAILED", 500);
  }
}
