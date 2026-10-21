"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {ArrowLeft, MessageCircle} from "lucide-react";

import {Link} from "@/i18n/navigation";

export function MemberReportReader({emailHtml, assessmentReference, availableAt, locale}: {emailHtml: string; assessmentReference: string; availableAt: string; locale: "en" | "es"}) {
  const t = useTranslations("memberArea.reports");
  const tt = useTranslations("treatments");
  const [height, setHeight] = useState(900);
  const date = new Intl.DateTimeFormat(locale, {dateStyle: "long"}).format(new Date(availableAt));

  return <main id="main-content" className="flex-1 bg-background">
    <section className="bg-primary-dark px-4 py-8 text-white sm:px-6 sm:py-10 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/reports" className="inline-flex min-h-11 items-center gap-2 rounded-full text-sm font-semibold text-white/90 underline decoration-white/35 underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><ArrowLeft aria-hidden="true" size={17}/>{t("back")}</Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.17em] text-accent">{t("privateReport")}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{t("contentTitle")}</h1>
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/80">
          <div><dt className="font-semibold text-white">{t("reportDate")}</dt><dd className="mt-1">{date}</dd></div>
          <div><dt className="font-semibold text-white">{t("assessmentReference")}</dt><dd className="mt-1 font-mono">{assessmentReference}</dd></div>
        </dl>
      </div>
    </section>

    <div className="mx-auto max-w-5xl space-y-6 px-4 py-7 sm:px-6 sm:py-10 lg:px-10">
      <section aria-labelledby="question-title" className="rounded-[1.5rem] border border-accent-strong/35 bg-pale-blush p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
        <div className="min-w-0"><h2 id="question-title" className="font-display text-2xl font-semibold text-primary-dark">{t("questionAbout")}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{t("questionAboutBody")}</p></div>
        <Link href="/messages" className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(30,58,95,0.16)] transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:mt-0 sm:w-auto sm:shrink-0"><MessageCircle aria-hidden="true" size={18}/>{t("openMessages")}</Link>
      </section>

      <section className="rounded-[1.5rem] border border-primary/10 bg-surface p-5 sm:p-6"><h2 className="font-display text-2xl text-primary-dark">{tt("dashboardNextTitle")}</h2><p className="mt-2 leading-6 text-muted">{tt("dashboardNextBody")}</p><Link href="/treatments" className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-5 font-semibold text-white hover:bg-primary-hover sm:w-auto">{tt("viewTreatments")}</Link></section>

      <section aria-label={t("contentTitle")} className="overflow-hidden rounded-[1.5rem] border border-border bg-surface shadow-[0_12px_38px_rgba(20,42,71,0.07)]">
        <iframe
          title={t("contentTitle")}
          srcDoc={emailHtml}
          sandbox="allow-same-origin"
          onLoad={(event) => {
            const document = event.currentTarget.contentDocument;
            if (document) setHeight(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, 600));
          }}
          className="block w-full border-0"
          style={{height}}
        />
      </section>
      <p className="text-center text-xs leading-5 text-muted">{t("privateReport")}</p>
    </div>
  </main>;
}
