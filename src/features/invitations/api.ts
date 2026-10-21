import "server-only";

export function invitationApiError(code: string, status = 400) {
  return Response.json({error: code}, {status});
}
