import "server-only";

import {canAccessPrivateServices} from "@/features/auth/policy";
import {getAuthoritativeUser} from "@/lib/authorization";

export async function getInvitationApiUser(request: Request) {
  const currentUser = await getAuthoritativeUser(request.headers);
  if (!currentUser || !canAccessPrivateServices(currentUser)) return null;
  return currentUser;
}

export function invitationApiError(code: string, status = 400) {
  return Response.json({error: code}, {status});
}
