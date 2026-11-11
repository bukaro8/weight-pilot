"use client";

import {useRef, useState} from "react";
import {useTranslations} from "next-intl";
import {ArrowLeft, ChevronDown, FileText, MessageCircle, ShieldCheck} from "lucide-react";

import {Link} from "@/i18n/navigation";
import {TreatmentCard} from "@/components/treatments/treatment-card";
import type {Treatment} from "@/features/treatments/presentation";

export function MemberReportReader({emailHtml, assessmentReference, availableAt, locale, reportId, recommendedTreatment, recommendedPricePence}: {emailHtml: string; assessmentReference: string; availableAt: string; locale: "en" | "es"; reportId: string; recommendedTreatment: Treatment | null; recommendedPricePence: number | null}) {
  const t = useTranslations("memberArea.reports");
  const tt = useTranslations("treatments");
  const [height, setHeight] = useState(900);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const date = new Intl.DateTimeFormat(locale, {dateStyle: "long"}).format(new Date(availableAt));
  const measureFrame = () => {
    const document = frameRef.current?.contentDocument;
    if (document) setHeight(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, 600));
  };

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

    <div className="mx-auto max-w-5xl space-y-5 px-4 py-7 sm:px-6 sm:py-10 lg:px-10">
      {recommendedTreatment ? <section aria-labelledby="recommended-treatment-title" className="rounded-[1.7rem] border border-accent-strong/30 bg-pale-blush p-4 shadow-[0_18px_44px_rgba(20,42,71,0.07)] sm:p-7">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-surface text-primary shadow-sm"><ShieldCheck aria-hidden="true" size={23}/></div><p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-primary">{t("recommendedEyebrow")}</p><h2 id="recommended-treatment-title" className="mt-2 font-display text-3xl font-semibold leading-tight text-primary-dark sm:text-4xl">{t("recommendedTitle", {treatment: tt(recommendedTreatment === "SEMAGLUTIDE" ? "semaglutide" : "tirzepatide")})}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">{t("recommendedBody")}</p>
      </section> : null}

      <section aria-labelledby="question-title" className="rounded-[1.5rem] border border-accent-strong/35 bg-pale-blush p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
        <div className="min-w-0"><h2 id="question-title" className="font-display text-2xl font-semibold text-primary-dark">{t("questionAbout")}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{t("questionAboutBody")}</p></div>
        <Link href="/messages" className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(30,58,95,0.16)] transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:mt-0 sm:w-auto sm:shrink-0"><MessageCircle aria-hidden="true" size={18}/>{t("openMessages")}</Link>
      </section>
      {recommendedTreatment ? <section aria-labelledby="treatment-path-title" className="rounded-[1.5rem] border border-primary/10 bg-mist-blue/55 p-4 sm:p-7"><div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-center lg:gap-10"><div><h2 id="treatment-path-title" className="font-display text-2xl font-semibold text-primary-dark sm:text-3xl">{t("treatmentPathTitle")}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">{t("treatmentPathBody")}</p></div><TreatmentCard treatment={recommendedTreatment} pricePence={recommendedPricePence} locale={locale} source="report" reportId={reportId}/></div></section> : null}
      {recommendedTreatment ? <section className="rounded-[1.5rem] border border-primary/10 bg-surface p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6"><div><h2 className="font-display text-2xl text-primary-dark">{t("moreTreatmentsTitle")}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted">{t("moreTreatmentsBody")}</p></div><Link href="/treatments" className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-primary/20 bg-surface px-5 font-semibold text-primary transition-colors hover:bg-mist-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:mt-0 sm:w-auto sm:shrink-0">{t("moreTreatmentsAction")}</Link></section> : null}

      <details onToggle={(event) => {if (event.currentTarget.open) window.requestAnimationFrame(measureFrame);}} open={!recommendedTreatment} className="group overflow-hidden rounded-[1.5rem] border border-border bg-surface shadow-[0_12px_38px_rgba(20,42,71,0.07)]">
        <summary className="flex min-h-18 cursor-pointer list-none items-center gap-3 p-5 text-primary-dark marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:p-6 [&::-webkit-details-marker]:hidden"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-mist-blue text-primary"><FileText aria-hidden="true" size={21}/></span><span className="min-w-0 flex-1"><span className="block font-display text-xl font-semibold sm:text-2xl">{t("fullReportTitle")}</span><span className="mt-1 block text-xs leading-5 text-muted sm:text-sm">{t("fullReportHint")}</span></span><ChevronDown aria-hidden="true" size={20} className="shrink-0 text-primary transition-transform motion-reduce:transition-none group-open:rotate-180"/></summary>
        <div className="border-t border-border"><iframe ref={frameRef} title={t("contentTitle")} srcDoc={emailHtml} sandbox="allow-same-origin" onLoad={measureFrame} className="block w-full border-0" style={{height}}/></div>
      </details>
      <p className="text-center text-xs leading-5 text-muted">{t("privateReport")}</p>
    </div>
  </main>;
}
