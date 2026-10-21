"use client";

import {BarChart3, ClipboardCheck, ExternalLink, Menu, MessageCircle, PoundSterling, TicketCheck, Users, X} from "lucide-react";
import {useTranslations} from "next-intl";
import {useEffect, useState} from "react";

import {AccountAction} from "@/components/auth/account-action";
import {BrandLogo} from "@/components/brand-logo";
import {LanguageToggle} from "@/components/language-toggle";
import {Link, usePathname} from "@/i18n/navigation";
import {cn} from "@/lib/utils";

const adminLinks = [
  ["/admin", "dashboard", BarChart3],
  ["/admin/users", "users", Users],
  ["/admin/questionnaires", "reviews", ClipboardCheck],
  ["/admin/messages", "messages", MessageCircle],
  ["/admin/invitations", "invitations", TicketCheck],
  ["/admin/pricing", "pricing", PoundSterling],
] as const;

export function AdminShell({administratorName, unreadMessages = 0, children}: {administratorName: string; unreadMessages?: number; children: React.ReactNode}) {
  const t = useTranslations("adminNav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const active = (href: string) => href === "/admin" ? pathname === href : pathname.startsWith(href);

  const navigation = (onNavigate?: () => void) => <nav aria-label={t("navigation")} className="grid gap-1.5">{adminLinks.map(([href, key, Icon]) => <Link key={href} href={href} onClick={onNavigate} aria-current={active(href) ? "page" : undefined} aria-label={key === "messages" && unreadMessages > 0 ? t("unreadMessages", {count: unreadMessages}) : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong", active(href) ? "bg-white text-primary-dark shadow-sm" : "text-white/75 hover:bg-white/10 hover:text-white")}><Icon aria-hidden="true" size={18}/><span className="flex-1">{t(key)}</span>{key === "messages" && unreadMessages > 0 ? <span aria-hidden="true" className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-primary-dark">{unreadMessages > 99 ? "99+" : unreadMessages}</span> : null}</Link>)}</nav>;

  return <div className="min-h-screen bg-background lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
    <aside className="sticky top-0 hidden h-screen flex-col bg-primary-dark px-5 py-6 text-white lg:flex">
      <Link href="/" aria-label={t("publicHome")} className="inline-flex min-h-11 w-fit items-center rounded-md bg-white px-3"><BrandLogo className="w-36"/></Link>
      <div className="mt-7 border-b border-white/10 pb-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">{t("workspace")}</p><p className="mt-2 truncate text-sm font-semibold text-white">{administratorName}</p></div>
      <div className="mt-5 flex-1">{navigation()}</div>
      <div className="space-y-3 border-t border-white/10 pt-5"><Link href="/" className="flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold text-white/75 hover:bg-white/10 hover:text-white"><ExternalLink aria-hidden="true" size={18}/>{t("publicHome")}</Link><AccountAction className="w-full border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white"/></div>
    </aside>
    <div className="min-w-0">
      <header className="sticky top-0 z-40 border-b border-primary/10 bg-background/95 px-3 backdrop-blur-xl lg:hidden"><div className="flex h-[4.5rem] items-center justify-between gap-2"><Link href="/admin" aria-label={t("dashboard")} className="inline-flex min-h-11 shrink-0 items-center"><BrandLogo className="w-[112px] min-[360px]:w-[128px]"/></Link><div className="flex shrink-0 items-center gap-1.5"><LanguageToggle/><button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls="admin-mobile-navigation" aria-label={open ? t("closeMenu") : t("openMenu")} className="flex size-11 items-center justify-center rounded-full border border-primary/15 bg-surface text-primary shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{open ? <X aria-hidden="true" size={20}/> : <Menu aria-hidden="true" size={20}/>}</button></div></div>
        {open ? <div id="admin-mobile-navigation" className="absolute inset-x-0 top-full border-b border-primary/10 bg-primary-dark px-4 py-4 shadow-xl"><p className="mb-3 truncate px-3 text-xs font-semibold text-white/60">{administratorName}</p>{navigation(() => setOpen(false))}<div className="mt-4 grid gap-2 border-t border-white/10 pt-4"><Link href="/" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold text-white/75"><ExternalLink aria-hidden="true" size={18}/>{t("publicHome")}</Link><AccountAction className="w-full border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white"/></div></div> : null}
      </header>
      <div className="min-h-screen min-w-0">{children}</div>
    </div>
  </div>;
}
