"use client";

import {SiteFooter} from "@/components/site-footer";
import {SiteHeader} from "@/components/site-header";
import {usePathname} from "@/i18n/navigation";

export function SiteShell({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return children;
  return <div className="flex min-h-screen flex-col"><SiteHeader/>{children}<SiteFooter/></div>;
}
