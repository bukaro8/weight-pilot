import "server-only";

import {canAccessAdmin, canAccessPrivateServices} from "@/features/auth/policy";
import {getAuthoritativeUser} from "@/lib/authorization";

export async function getAdminApiUser(request: Request) {
  const currentUser = await getAuthoritativeUser(request.headers);
  return currentUser && canAccessPrivateServices(currentUser) && canAccessAdmin(currentUser) ? currentUser : null;
}

export function adminApiError(code: string, status = 400) {
  return Response.json({error: code}, {status, headers: {"cache-control": "private, no-store"}});
}

export function adminApiSuccess(body: unknown, status = 200) {
  return Response.json(body, {status, headers: {"cache-control": "private, no-store"}});
}
