import "server-only";

import {canAccessAdmin, canAccessPrivateServices} from "@/features/auth/policy";
import {getAuthoritativeUser} from "@/lib/authorization";

export async function getQuestionnaireApiUser(request: Request) {
  const currentUser = await getAuthoritativeUser(request.headers);
  return currentUser && canAccessPrivateServices(currentUser) ? currentUser : null;
}

export async function getQuestionnaireAdminApiUser(request: Request) {
  const currentUser = await getQuestionnaireApiUser(request);
  return currentUser && canAccessAdmin(currentUser) ? currentUser : null;
}

export function questionnaireApiError(code: string, status = 400) {
  return Response.json({error: code}, {status, headers: {"cache-control": "private, no-store"}});
}

export function questionnaireApiSuccess(body: unknown, status = 200) {
  return Response.json(body, {status, headers: {"cache-control": "private, no-store"}});
}
