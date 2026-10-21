"use client";

import {Check, LoaderCircle} from "lucide-react";
import {useTranslations} from "next-intl";
import {useEffect, useState} from "react";

const stages = ["reviewing", "checking", "preparing"] as const;

export function AssessmentAnalysisLoading() {
  const t = useTranslations("questionnaire.analysis");
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [window.setTimeout(() => setStage(1), 450), window.setTimeout(() => setStage(2), 900)];
    return () => timers.forEach(window.clearTimeout);
  }, []);

  return <main id="main-content" className="flex flex-1 items-center justify-center bg-background px-4 py-16 sm:px-6">
    <div className="w-full max-w-md rounded-[1.75rem] border border-primary/10 bg-surface p-6 text-center shadow-[0_18px_48px_rgba(20,42,71,0.08)] min-[375px]:p-8">
      <div className="relative mx-auto flex size-14 items-center justify-center rounded-2xl bg-mist-blue text-primary"><div className="absolute inset-0 rounded-2xl border border-primary/15 motion-safe:animate-pulse"/><LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" size={26}/></div>
      <h1 className="mt-5 font-display text-3xl font-semibold text-primary-dark">{t("title")}</h1>
      <p className="mt-2 text-sm leading-6 text-muted">{t("body")}</p>
      <ol className="mt-6 space-y-2 text-left" aria-label={t("label")}>{stages.map((item, index) => <li key={item} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors motion-reduce:transition-none ${index === stage ? "bg-pale-blush text-primary-dark" : index < stage ? "text-primary" : "text-muted/70"}`}>{index < stage ? <Check aria-hidden="true" size={18}/> : <span className={`size-2 rounded-full ${index === stage ? "bg-primary motion-safe:animate-pulse" : "bg-border"}`} aria-hidden="true"/>}<span>{t(item)}</span></li>)}</ol>
      <p className="sr-only" role="status" aria-live="polite">{t(stages[stage])}</p>
    </div>
  </main>;
}
