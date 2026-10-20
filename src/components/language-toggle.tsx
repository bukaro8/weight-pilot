"use client";
import {useLocale, useTranslations} from "next-intl";
import {usePathname, useRouter} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";
import {waitForPendingDraftSaves} from "@/lib/draft-events";
export function LanguageToggle() {
  const locale = useLocale() as Locale; const pathname = usePathname(); const router = useRouter(); const t = useTranslations("nav");
  return <div className="inline-flex h-12 items-center rounded-full border border-primary/15 bg-surface p-0.5 shadow-[0_2px_10px_rgba(30,58,95,0.06)]" role="group" aria-label={t("language")}>{(["en", "es"] as const).map((item) => <button key={item} type="button" onClick={async () => {if (item === locale) return; if (!await waitForPendingDraftSaves()) return; router.replace(`${pathname}${window.location.search}`, {locale: item});}} aria-pressed={locale === item} aria-label={item === "en" ? t("english") : t("spanish")} className={`h-11 min-w-11 rounded-full px-2 text-xs font-bold uppercase tracking-[0.08em] transition-[color,background-color,box-shadow] duration-200 focus-visible:z-10 ${locale === item ? "bg-primary text-white shadow-[0_2px_8px_rgba(30,58,95,0.2)]" : "bg-surface text-primary hover:bg-mist-blue"}`}>{item}</button>)}</div>;
}
