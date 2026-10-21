"use client";

import {ArrowLeft} from "lucide-react";
import {useTranslations} from "next-intl";

import {Link} from "@/i18n/navigation";

export default function MemberReportNotFound() {
  const t = useTranslations("memberArea.reports");
  return <main id="main-content" className="flex flex-1 items-center bg-background px-4 py-16 sm:px-6">
    <section className="mx-auto w-full max-w-xl rounded-[1.5rem] border border-border bg-surface p-7 text-center shadow-[0_20px_60px_rgba(30,58,95,0.08)] sm:p-10">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-pale-blush font-display text-xl font-semibold text-primary">!</div>
      <h1 className="mt-6 font-display text-3xl font-semibold text-primary-dark">{t("reportUnavailable")}</h1>
      <Link href="/reports" className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><ArrowLeft aria-hidden="true" size={17}/>{t("back")}</Link>
    </section>
  </main>;
}
