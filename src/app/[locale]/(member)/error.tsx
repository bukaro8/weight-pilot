"use client";

import {useTranslations} from "next-intl";

export default function MemberAreaError({reset}: {error: Error & {digest?: string}; reset: () => void}) {
  const t = useTranslations("memberArea.error");
  return <main id="main-content" className="flex flex-1 items-center bg-background px-4 py-16 sm:px-6">
    <section className="mx-auto w-full max-w-xl rounded-[1.5rem] border border-border bg-surface p-7 text-center shadow-[0_20px_60px_rgba(30,58,95,0.08)] sm:p-10">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-pale-blush font-display text-xl font-semibold text-primary">!</div>
      <h1 className="mt-6 font-display text-3xl font-semibold text-primary-dark">{t("title")}</h1>
      <p className="mt-3 leading-7 text-muted">{t("body")}</p>
      <button type="button" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" onClick={reset}>{t("retry")}</button>
    </section>
  </main>;
}
