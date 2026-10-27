import createMiddleware from "next-intl/middleware";
import {NextResponse, type NextRequest} from "next/server";
import {routing} from "@/i18n/routing";
const handleLocaleRouting = createMiddleware(routing);
// Keep the printed QR address unprefixed without changing other site routes.
const handleSerumRouting = createMiddleware({...routing, localePrefix: "as-needed", localeDetection: false});

export default function proxy(request: NextRequest) {
  if (/^\/serums\/ghk-cu\/?$/.test(request.nextUrl.pathname)) return handleSerumRouting(request);
  // The unprefixed root is resolved server-side so a signed-in member's saved
  // language can be honoured without changing explicit /en or /es URLs.
  if (request.nextUrl.pathname === "/") return NextResponse.next();
  return handleLocaleRouting(request);
}

export const config = {matcher: ["/((?!api|_next|_vercel|icon(?:$|/)|apple-icon(?:$|/)|.*\\..*).*)"]};
