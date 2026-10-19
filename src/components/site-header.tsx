"use client";

import {useEffect, useState} from "react";
import {Menu, X} from "lucide-react";
import {useTranslations} from "next-intl";
import {BrandLogo} from "@/components/brand-logo";
import {AccountAction} from "@/components/auth/account-action";
import {Link, usePathname} from "@/i18n/navigation";
import {cn} from "@/lib/utils";
import {LanguageToggle} from "./language-toggle";

const links = [["/", "home"], ["/consultations", "consultations"], ["/invitations", "invitations"], ["/messages", "messages"]] as const;

export function SiteHeader() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-primary/10 bg-background/92 backdrop-blur-xl supports-[backdrop-filter]:bg-background/82">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-1.5 px-3 min-[360px]:gap-3 min-[360px]:px-4 sm:px-6 lg:h-20 lg:px-10">
        <Link href="/" aria-label={t("home")} className="inline-flex min-h-11 shrink-0 items-center rounded-md"><BrandLogo priority className="w-[112px] min-[360px]:w-[132px] sm:w-[148px] lg:w-[164px]"/></Link>
        <nav className="hidden h-full items-center gap-1 lg:flex" aria-label={t("primaryNavigation")}>
          {links.map(([href, key]) => <Link key={key} href={href} aria-current={isActive(href) ? "page" : undefined} className={cn("relative inline-flex h-full items-center px-3 text-sm font-medium text-muted transition-colors duration-200 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-accent-strong after:transition-transform hover:text-primary", isActive(href) && "text-primary after:scale-x-100")}>{t(key)}</Link>)}
        </nav>
        <div className="hidden items-center gap-2.5 lg:flex"><LanguageToggle/><AccountAction/></div>
        <div className="flex shrink-0 items-center gap-1.5 lg:hidden">
          <LanguageToggle/>
          <button type="button" className="flex size-11 items-center justify-center rounded-full border border-primary/15 bg-surface text-primary shadow-sm transition-[color,background-color,border-color] duration-200 hover:border-primary/25 hover:bg-mist-blue" onClick={() => setOpen(!open)} aria-label={open ? t("closeMenu") : t("menu")} aria-expanded={open} aria-controls="mobile-navigation">{open ? <X aria-hidden="true" size={21}/> : <Menu aria-hidden="true" size={21}/>}</button>
        </div>
      </div>
      <div id="mobile-navigation" className={cn("absolute inset-x-0 top-full origin-top border-b border-primary/10 bg-surface px-4 shadow-[0_18px_40px_rgba(20,42,71,0.12)] transition-[opacity,transform,visibility] duration-200 lg:hidden", open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0")} aria-hidden={!open}>
        <nav className="mx-auto flex max-w-xl flex-col py-4" aria-label={t("primaryNavigation")}>
          {links.map(([href,key]) => <Link key={key} href={href} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1} aria-current={isActive(href) ? "page" : undefined} className={cn("flex min-h-12 items-center justify-between rounded-xl px-4 font-medium text-primary transition-colors hover:bg-mist-blue", isActive(href) && "bg-mist-blue")}><span>{t(key)}</span><span className={cn("size-1.5 rounded-full bg-accent-strong opacity-0", isActive(href) && "opacity-100")}/></Link>)}
          <div className="mt-3 border-t pt-4"><AccountAction tabIndex={open ? 0 : -1} onNavigate={() => setOpen(false)} className="w-full"/></div>
        </nav>
      </div>
    </header>
  );
}
