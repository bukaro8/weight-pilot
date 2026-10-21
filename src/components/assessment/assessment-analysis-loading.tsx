"use client";

import Image from "next/image";
import {Check} from "lucide-react";
import {useTranslations} from "next-intl";
import {useEffect, useRef, useState} from "react";
import logo from "@/assets/images/WeightPilot Compass Logo.png";
import {ASSESSMENT_MINIMUM_DURATION_MS, assessmentLoaderStage, canFinishAssessmentLoading} from "@/features/assessment/loading";

const stages = ["reviewing", "checking", "preparing"] as const;

export function AssessmentAnalysisLoading({startedAt = 0, ready = true, onComplete}: {startedAt?: number; ready?: boolean; onComplete?: () => void}) {
  const t = useTranslations("questionnaire.analysis");
  const [stage, setStage] = useState(0);
  const completed = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    const update = () => {
      const elapsed = Math.max(0, Date.now() - startedAt);
      setStage(assessmentLoaderStage(elapsed));
      if (ready && !completed.current && canFinishAssessmentLoading(elapsed, ready, ASSESSMENT_MINIMUM_DURATION_MS)) {
        completed.current = true;
        onCompleteRef.current?.();
      }
    };
    update();
    const timer = window.setInterval(update, 100);
    return () => window.clearInterval(timer);
  }, [ready, startedAt]);

  return <main id="main-content" className="flex flex-1 items-center justify-center bg-background px-4 py-16 sm:px-6">
    <div className="w-full max-w-md rounded-[1.75rem] border border-primary/10 bg-surface p-6 text-center shadow-[0_18px_48px_rgba(20,42,71,0.08)] min-[375px]:p-8" aria-busy={!ready}>
      <div className="relative mx-auto size-16 rounded-full bg-mist-blue ring-1 ring-primary/10"><div className="absolute -inset-2 rounded-full border border-accent-strong/30 motion-safe:animate-[spin_7s_linear_infinite] motion-reduce:animate-none" aria-hidden="true"/><div className="absolute inset-0 overflow-hidden rounded-full motion-safe:animate-[spin_9s_ease-in-out_infinite] motion-reduce:animate-none"><Image src={logo} alt="" fill sizes="64px" className="object-cover object-left" priority/></div></div>
      <h1 className="mt-6 font-display text-3xl font-semibold text-primary-dark">{t("title")}</h1>
      <p className="mt-2 text-sm leading-6 text-muted">{t("body")}</p>
      <ol className="mt-6 space-y-2 text-left" aria-label={t("label")}>{stages.map((item, index) => <li key={item} aria-current={index === stage ? "step" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-[color,background-color] duration-500 motion-reduce:transition-none ${index === stage ? "bg-pale-blush text-primary-dark" : index < stage ? "text-primary" : "text-muted/70"}`}>{index < stage ? <Check aria-hidden="true" size={18}/> : <span className={`size-2 shrink-0 rounded-full ${index === stage ? "bg-primary motion-safe:animate-pulse" : "bg-border"}`} aria-hidden="true"/>}<span>{t(item)}</span></li>)}</ol>
      <p className="sr-only" role="status" aria-live="polite">{t(stages[stage])}</p>
    </div>
  </main>;
}
