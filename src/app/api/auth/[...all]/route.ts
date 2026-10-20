import {toNextJsHandler} from "better-auth/next-js";

import {auth} from "@/features/auth/server";
import {withLocalAuthClientIp} from "@/features/auth/config";

const handlers = toNextJsHandler(auth);

export function GET(request: Request) {
  return handlers.GET(withLocalAuthClientIp(request, process.env.BETTER_AUTH_URL));
}

export function POST(request: Request) {
  return handlers.POST(withLocalAuthClientIp(request, process.env.BETTER_AUTH_URL));
}
