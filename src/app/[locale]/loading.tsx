"use client";
import {useTranslations} from "next-intl";
export default function Loading() {
  const t = useTranslations("common");
  return <main id="main-content" className="flex flex-1 items-center justify-center px-4 py-20" aria-busy="true" aria-label={t("loading")}><span className="sr-only">{t("loading")}</span><div className="w-full max-w-2xl rounded-[1.5rem] border bg-surface p-7 shadow-[0_20px_60px_rgba(30,58,95,0.08)] sm:p-10"><div className="soft-pulse size-12 rounded-2xl bg-mist-blue"/><div className="soft-pulse mt-7 h-4 w-24 rounded-full bg-pale-blush"/><div className="soft-pulse mt-4 h-10 w-4/5 rounded-xl bg-mist-blue"/><div className="soft-pulse mt-5 h-4 w-full rounded-full bg-mist-blue/70"/><div className="soft-pulse mt-3 h-4 w-2/3 rounded-full bg-mist-blue/70"/></div></main>;
}
