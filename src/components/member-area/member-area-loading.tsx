"use client";

import {useTranslations} from "next-intl";

export function MemberAreaLoading() {
  const t = useTranslations("memberArea.reports");
  return <main id="main-content" className="flex-1 bg-background px-4 py-12 sm:px-6">
    <div role="status" aria-live="polite" className="mx-auto max-w-5xl">
      <span className="sr-only">{t("loading")}</span>
      <div className="h-40 animate-pulse rounded-[1.5rem] bg-primary-dark/10 motion-reduce:animate-none"/>
      <div className="mt-7 space-y-4">{[0, 1].map((item) => <div key={item} className="h-32 animate-pulse rounded-[1.5rem] bg-surface shadow-sm motion-reduce:animate-none"/>)}</div>
    </div>
  </main>;
}
