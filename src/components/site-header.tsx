"use client";

import {useEffect, useRef, useState} from "react";
import {Menu, X} from "lucide-react";
import {useTranslations} from "next-intl";
import {BrandLogo} from "@/components/brand-logo";
import {AccountAction} from "@/components/auth/account-action";
import {authClient} from "@/features/auth/client";
import {Link, usePathname} from "@/i18n/navigation";
import {cn} from "@/lib/utils";
import {LanguageToggle} from "./language-toggle";
import {headerNavigationKind} from "@/features/navigation/visibility";
import {NotificationBadge} from "@/components/navigation/notification-badge";
import {useNavigationNotifications} from "@/components/navigation/use-navigation-notifications";
import {memberNavigationCount} from "@/features/notifications/policy";

const memberLinks = [["/dashboard", "dashboard"], ["/consultations", "consultations"], ["/reports", "reports"], ["/treatments", "treatments"], ["/requests", "requests"], ["/invitations", "invitations"], ["/messages", "messages"], ["/serums/ghk-cu", "serums"]] as const;
const desktopPrimaryMemberLinks = [memberLinks[0], memberLinks[1], memberLinks[2], memberLinks[6]] as const;
const desktopMoreMemberLinks = [memberLinks[3], memberLinks[4], memberLinks[5], memberLinks[7]] as const;
const adminLinks = [["/", "home"], ["/admin", "admin"], ["/serums/ghk-cu", "serums"]] as const;
const publicLinks = [["/", "home"], ["/serums/ghk-cu", "serums"]] as const;

export function SiteHeader() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const {data: session, isPending} = authClient.useSession();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreContainerRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const [catalogueEligible, setCatalogueEligible] = useState(false);
  const navigationKind = headerNavigationKind(isPending, session?.user.role);
  const notificationCounts = useNavigationNotifications(!isPending && session?.user.role === "USER", pathname, session?.user.id);
  const links = navigationKind === "admin" ? adminLinks : navigationKind === "member" ? memberLinks.filter(([href]) => catalogueEligible || (href !== "/treatments" && href !== "/requests")) : publicLinks;
  const homeHref = navigationKind === "member" ? "/dashboard" : navigationKind === "admin" ? "/admin" : "/";
  const homeLabel = navigationKind === "member" ? t("dashboard") : navigationKind === "admin" ? t("admin") : t("home");

  useEffect(() => {
    let active = true;
    if (!isPending && session?.user.role === "USER") {
      fetch("/api/treatments/eligibility", {cache: "no-store"}).then((response) => response.ok ? response.json() : null).then((data: {eligible?: boolean} | null) => {if (active) setCatalogueEligible(Boolean(data?.eligible));}).catch(() => {});
    }
    return () => {active = false;};
  }, [isPending, session?.user.role, pathname]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      if (moreOpen) {
        setMoreOpen(false);
        moreButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [moreOpen]);

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !moreContainerRef.current?.contains(event.target)) setMoreOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);
  const countFor = (href: string) => href === "/messages" ? notificationCounts.messages : href === "/reports" ? notificationCounts.reports : href === "/requests" ? notificationCounts.requests : 0;
  const desktopLinks = navigationKind === "member" ? desktopPrimaryMemberLinks : links;
  const desktopMoreLinks = navigationKind === "member" ? desktopMoreMemberLinks.filter(([href]) => catalogueEligible || (href !== "/treatments" && href !== "/requests")) : [];
  const moreIsActive = desktopMoreLinks.some(([href]) => isActive(href));
  const moreUnread = desktopMoreLinks.reduce((total, [href]) => total + countFor(href), 0);
  const mobileUnread = navigationKind === "member" ? memberNavigationCount(notificationCounts) : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-primary/10 bg-background/92 backdrop-blur-xl supports-[backdrop-filter]:bg-background/82">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-1.5 px-3 min-[360px]:gap-3 min-[360px]:px-4 sm:px-6 lg:h-20 lg:px-8 2xl:px-10">
        <Link href={homeHref} aria-label={homeLabel} className="inline-flex min-h-11 shrink-0 items-center rounded-md"><BrandLogo priority className="w-[112px] min-[360px]:w-[132px] sm:w-[148px] lg:w-[164px]"/></Link>
        <nav className="hidden h-full items-center gap-1 2xl:gap-2 xl:flex" aria-label={t("primaryNavigation")}>
          {desktopLinks.map(([href, key]) => <Link key={key} href={href} aria-current={isActive(href) ? "page" : undefined} aria-label={countFor(href) > 0 ? t("itemUnread", {item: t(key), count: countFor(href)}) : undefined} className={cn("relative inline-flex h-full items-center gap-2 px-2.5 text-sm font-medium text-muted transition-colors duration-200 after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-accent-strong after:transition-transform hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", isActive(href) && "text-primary after:scale-x-100")}>{t(key)}<NotificationBadge count={countFor(href)} reserveSpace={href === "/messages" || href === "/reports"}/></Link>)}
          {desktopMoreLinks.length > 0 ? <div ref={moreContainerRef} className="relative flex h-full items-center">
            <button ref={moreButtonRef} type="button" aria-expanded={moreOpen} aria-controls="member-more-navigation" aria-haspopup="true" aria-label={moreUnread > 0 ? t("itemUnread", {item: t("more"), count: moreUnread}) : undefined} onClick={() => setMoreOpen((value) => !value)} className={cn("relative inline-flex h-full min-h-11 items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-accent-strong after:transition-transform", (moreIsActive || moreOpen) && "text-primary after:scale-x-100")}>{t("more")}<NotificationBadge count={moreUnread} reserveSpace/><span aria-hidden="true" className={cn("text-[10px] transition-transform", moreOpen && "rotate-180")}>▾</span></button>
            {moreOpen ? <div id="member-more-navigation" className="absolute right-0 top-[calc(100%-0.25rem)] z-50 w-56 rounded-2xl border border-primary/10 bg-surface p-2 shadow-[0_18px_40px_rgba(20,42,71,0.16)]">{desktopMoreLinks.map(([href, key]) => <Link key={key} href={href} onClick={() => setMoreOpen(false)} aria-current={isActive(href) ? "page" : undefined} aria-label={countFor(href) > 0 ? t("itemUnread", {item: t(key), count: countFor(href)}) : undefined} className={cn("flex min-h-11 items-center justify-between rounded-xl px-3 text-sm font-medium text-primary transition-colors hover:bg-mist-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", isActive(href) && "bg-mist-blue font-semibold")}>{t(key)}<span className="flex items-center gap-2"><NotificationBadge count={countFor(href)}/><span aria-hidden="true" className={cn("size-1.5 rounded-full bg-accent-strong opacity-0", isActive(href) && "opacity-100")}/></span></Link>)}</div> : null}
          </div> : null}
        </nav>
        <div className="hidden items-center gap-2.5 xl:flex"><LanguageToggle/><AccountAction/></div>
        <div className="flex shrink-0 items-center gap-1.5 xl:hidden">
          <LanguageToggle/>
          <button type="button" className="relative flex size-11 items-center justify-center rounded-full border border-primary/15 bg-surface text-primary shadow-sm transition-[color,background-color,border-color] duration-200 hover:border-primary/25 hover:bg-mist-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => setOpen(!open)} aria-label={mobileUnread > 0 ? t("itemUnread", {item: open ? t("closeMenu") : t("menu"), count: mobileUnread}) : open ? t("closeMenu") : t("menu")} aria-expanded={open} aria-controls="mobile-navigation">{open ? <X aria-hidden="true" size={21}/> : <Menu aria-hidden="true" size={21}/>}<NotificationBadge count={mobileUnread} className="absolute -right-1 -top-1"/></button>
        </div>
      </div>
      <div id="mobile-navigation" className={cn("absolute inset-x-0 top-full max-h-[calc(100dvh-4.5rem)] origin-top overflow-y-auto border-b border-primary/10 bg-surface px-4 shadow-[0_18px_40px_rgba(20,42,71,0.12)] transition-[opacity,transform,visibility] duration-200 xl:hidden", open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0")} aria-hidden={!open}>
        <nav className="mx-auto flex max-w-xl flex-col py-4" aria-label={t("primaryNavigation")}>
          {links.map(([href,key]) => <Link key={key} href={href} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1} aria-current={isActive(href) ? "page" : undefined} aria-label={countFor(href) > 0 ? t("itemUnread", {item: t(key), count: countFor(href)}) : undefined} className={cn("flex min-h-12 items-center justify-between rounded-xl px-4 font-medium text-primary transition-colors hover:bg-mist-blue", isActive(href) && "bg-mist-blue")}><span>{t(key)}</span><span className="flex items-center gap-3"><NotificationBadge count={countFor(href)}/><span aria-hidden="true" className={cn("size-1.5 rounded-full bg-accent-strong opacity-0", isActive(href) && "opacity-100")}/></span></Link>)}
          <div className="mt-3 border-t pt-4"><AccountAction tabIndex={open ? 0 : -1} onNavigate={() => setOpen(false)} className="w-full"/></div>
        </nav>
      </div>
    </header>
  );
}
