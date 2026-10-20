import {postLoginDestination} from "@/features/auth/destination";
import {getAuthoritativeUser} from "@/lib/authorization";

export async function GET(request: Request) {
  const currentUser = await getAuthoritativeUser(request.headers);
  if (!currentUser) return Response.json({error: "UNAUTHORISED"}, {status: 401, headers: {"cache-control": "private, no-store"}});
  const requestedPath = new URL(request.url).searchParams.get("next");
  return Response.json({destination: postLoginDestination(currentUser, requestedPath)}, {headers: {"cache-control": "private, no-store"}});
}
