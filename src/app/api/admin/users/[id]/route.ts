import {adminApiError, adminApiSuccess, getAdminApiUser} from "@/features/admin/api";
import {permanentlyDeleteManagedUser, type AdminUserMutationResult, updateManagedUserStatus} from "@/features/admin/user-management";
import {adminUserDeleteSchema, adminUserIdSchema, adminUserStatusSchema} from "@/features/admin/validation";
import {assertTrustedMutationOrigin} from "@/lib/request-security";

function mutationError(result: AdminUserMutationResult) {
  if (result === "NOT_FOUND") return adminApiError("USER_NOT_FOUND", 404);
  if (result === "ADMIN_PROTECTED" || result === "SELF_PROTECTED") return adminApiError(result, 403);
  return adminApiError("USER_MUTATION_FAILED", 500);
}

export async function PATCH(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    assertTrustedMutationOrigin(request);
    const administrator = await getAdminApiUser(request);
    if (!administrator) return adminApiError("UNAUTHORISED", 401);
    const {id} = await params;
    if (!adminUserIdSchema.safeParse(id).success) return adminApiError("USER_NOT_FOUND", 404);
    const parsed = adminUserStatusSchema.safeParse(await request.json());
    if (!parsed.success) return adminApiError("USER_STATUS_INVALID", 422);
    const result = await updateManagedUserStatus(administrator.id, id, parsed.data.status);
    if (result !== "UPDATED") return mutationError(result);
    return adminApiSuccess({status: parsed.data.status});
  } catch (error) {
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return adminApiError("UNTRUSTED_ORIGIN", 403);
    return adminApiError("USER_STATUS_UPDATE_FAILED", 500);
  }
}

export async function DELETE(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    assertTrustedMutationOrigin(request);
    const administrator = await getAdminApiUser(request);
    if (!administrator) return adminApiError("UNAUTHORISED", 401);
    const {id} = await params;
    if (!adminUserIdSchema.safeParse(id).success) return adminApiError("USER_NOT_FOUND", 404);
    const parsed = adminUserDeleteSchema.safeParse(await request.json());
    if (!parsed.success) return adminApiError("DELETE_CONFIRMATION_INVALID", 422);
    const result = await permanentlyDeleteManagedUser(administrator.id, id);
    if (result !== "DELETED") return mutationError(result);
    return adminApiSuccess({deleted: true});
  } catch (error) {
    if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") return adminApiError("UNTRUSTED_ORIGIN", 403);
    return adminApiError("USER_DELETE_FAILED", 500);
  }
}
