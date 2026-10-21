import {cookies} from "next/headers";
import {getAuthoritativeUser} from "@/lib/authorization";
import {canAccessPrivateServices} from "@/features/auth/policy";
import {localizedRootPath, resolveInitialLocale} from "@/i18n/locale-preference";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const member = await getAuthoritativeUser(request.headers).catch(() => null);
  const locale = resolveInitialLocale({
    manualLocale: cookieStore.get("NEXT_LOCALE")?.value,
    memberLocale: member && canAccessPrivateServices(member) ? member.preferredLanguage : undefined,
    acceptLanguage: request.headers.get("accept-language") ?? undefined,
  });
  return new Response(null, {
    status: 307,
    headers: {
      location: localizedRootPath(locale, new URL(request.url).searchParams),
      "cache-control": "private, no-store",
    },
  });
}
