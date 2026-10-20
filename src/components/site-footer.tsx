"use client";

import {useTranslations} from "next-intl";

import {BrandLogo} from "@/components/brand-logo";
import {Link} from "@/i18n/navigation";

export function SiteFooter() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");
  return (
    <footer className="border-t border-primary/10 bg-mist-blue/60">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-10">
        <div className="grid gap-9 sm:grid-cols-[1fr_auto] sm:items-start">
          <div><Link href="/" aria-label={nav("home")} className="inline-flex min-h-11 items-center rounded-md"><BrandLogo className="w-[150px]"/></Link><p className="mt-3 max-w-sm text-sm leading-6 text-muted">{t("tagline")}</p></div>
          <nav aria-label={t("legalNavigation")} className="flex gap-x-6 gap-y-3 text-sm font-medium text-primary sm:justify-end"><span>{t("privacy")}</span><span>{t("terms")}</span></nav>
        </div>
        <div className="mt-9 border-t border-primary/10 pt-6"><p className="text-xs leading-5 text-muted">{t("copyright")}</p></div>
      </div>
    </footer>
  );
}
