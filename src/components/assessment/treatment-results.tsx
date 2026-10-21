"use client";

import {ArrowUpRight, CheckCircle2, ClipboardCheck, ExternalLink, Info, LoaderCircle, Scale, ShieldCheck} from "lucide-react";
import {useTranslations} from "next-intl";
import {useState} from "react";

import {Button} from "@/components/ui/button";
import type {AssessmentOutcome, MemberReviewRequest} from "@/features/assessment/types";
import {Link} from "@/i18n/navigation";
import type {HealthCondition} from "@/features/questionnaire/validation";
import {cn} from "@/lib/utils";

type ReportLanguage = "en" | "es";
type Props = {
  questionnaireId: string;
  firstName: string;
  outcome: AssessmentOutcome;
  healthConditions: HealthCondition[];
  preferredReportLanguage: ReportLanguage;
  initialReviewRequest: MemberReviewRequest | null;
};

const sources = {
  surmount: "https://www.nejm.org/doi/full/10.1056/NEJMoa2416394",
  step: "https://www.nejm.org/doi/full/10.1056/NEJMoa2032183",
  safety: "https://www.gov.uk/government/publications/glp-1-medicines-for-weight-loss-and-diabetes-what-you-need-to-know/glp-1-medicines-for-weight-loss-and-diabetes-what-you-need-to-know",
} as const;

export function TreatmentResults({questionnaireId, firstName, outcome, healthConditions, preferredReportLanguage, initialReviewRequest}: Props) {
  const t = useTranslations("assessmentResults");
  const memberAreaT = useTranslations("memberArea.reviewStatus");
  const questionnaireT = useTranslations("questionnaire");
  const [reportLanguage, setReportLanguage] = useState<ReportLanguage>(initialReviewRequest?.reportLanguage ?? preferredReportLanguage);
  const [reviewRequest, setReviewRequest] = useState(initialReviewRequest);
  const [requestState, setRequestState] = useState<"idle" | "submitting" | "error">("idle");
  const reviewRequired = outcome.decisionStatus === "REVIEW_REQUIRED";
  const reportReady = Boolean(reviewRequest?.reportId);
  const reviewTitle = reportReady
    ? memberAreaT("completedTitle")
    : reviewRequest?.status === "REQUESTED" ? memberAreaT("requestedTitle")
      : reviewRequest?.status === "IN_REVIEW" ? memberAreaT("inReviewTitle")
        : reviewRequest ? memberAreaT("unknownTitle")
          : t(reviewRequired ? "review.priorityTitle" : "review.title");
  const reviewBody = reportReady
    ? memberAreaT("completedBody")
    : reviewRequest?.status === "REQUESTED" ? memberAreaT("requestedBody")
      : reviewRequest?.status === "IN_REVIEW" ? memberAreaT("inReviewBody")
        : reviewRequest ? memberAreaT("unknownBody")
          : t(reviewRequired ? "review.priorityBody" : "review.body");

  async function requestReview() {
    setRequestState("submitting");
    try {
      const response = await fetch("/api/questionnaire/review-request", {
        method: "POST", headers: {"content-type": "application/json"},
        body: JSON.stringify({questionnaireId, reportLanguage}),
      });
      if (!response.ok) throw new Error("REQUEST_FAILED");
      const body = await response.json() as {reviewRequest: MemberReviewRequest};
      setReviewRequest(body.reviewRequest);
      setReportLanguage(body.reviewRequest.reportLanguage);
      setRequestState("idle");
    } catch { setRequestState("error"); }
  }

  const healthSummary = healthConditions.length
    ? healthConditions.map((item) => questionnaireT(`conditions.${item}`)).join(", ")
    : t("summary.notProvided");
  const medicationSummary = outcome.medicationInformation === "NONE_REPORTED"
    ? t("summary.noMedication")
    : outcome.medicationInformation === "PROVIDED"
      ? t("summary.medicationProvided")
      : t("summary.medicationUnclear");

  return <main id="main-content" className="flex-1 overflow-hidden bg-background">
    <section className="relative bg-primary-dark px-4 py-9 text-white sm:px-6 sm:py-12 lg:px-10 lg:py-14">
      <div className="absolute inset-y-0 right-0 hidden w-2/5 bg-[radial-gradient(circle_at_70%_35%,rgba(233,201,192,0.2),transparent_58%)] lg:block"/>
      <div className="relative mx-auto max-w-5xl">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10 text-accent"><ClipboardCheck aria-hidden="true" size={22}/></div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-accent">{t("hero.eyebrow")}</p>
        <h1 className="mt-3 max-w-3xl break-words font-display text-4xl font-semibold leading-[1.06] tracking-[-0.03em] sm:text-5xl">{t("hero.title", {name: firstName})}</h1>
        <p className="mt-4 max-w-2xl leading-7 text-white/80">{t("hero.body")}</p>
      </div>
    </section>

    <div className="mx-auto max-w-5xl space-y-8 px-4 py-9 sm:px-6 sm:py-12 lg:px-10 lg:py-14">
      <section aria-labelledby="measurements-title">
        <div className="flex items-center gap-3"><div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-mist-blue text-primary"><Scale aria-hidden="true" size={21}/></div><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-hover">{t("goal.eyebrow")}</p><h2 id="measurements-title" className="mt-1 font-display text-3xl font-semibold text-primary-dark">{t("goal.title")}</h2></div></div>
        <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label={t("goal.currentWeight")} value={outcome.currentWeightKg === null ? t("summary.notProvided") : `${outcome.currentWeightKg} kg`}/>
          <Metric label={t("goal.targetWeight")} value={outcome.targetWeightKg === null ? t("summary.notProvided") : `${outcome.targetWeightKg} kg`}/>
          <Metric label={t("goal.bmi")} value={outcome.bmi === null ? t("summary.notAvailable") : outcome.bmi.toFixed(1)}/>
          <Metric label={t("goal.targetLoss")} value={outcome.targetWeightLossPercentage === null ? t("summary.notAvailable") : `${outcome.targetWeightLossPercentage.toFixed(1)}%`}/>
        </dl>
      </section>

      <section aria-labelledby="summary-title" className="rounded-[1.5rem] border border-primary/10 bg-surface p-5 shadow-[0_10px_32px_rgba(20,42,71,0.045)] sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-hover">{t("summary.eyebrow")}</p>
        <h2 id="summary-title" className="mt-2 font-display text-3xl font-semibold text-primary-dark">{t("summary.title")}</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2"><SummaryItem label={t("summary.health")} value={healthSummary}/><SummaryItem label={t("summary.medication")} value={medicationSummary}/></dl>
      </section>

      <section aria-labelledby="result-title" className={cn("relative overflow-hidden rounded-[1.75rem] p-6 min-[375px]:p-7 sm:p-9", reviewRequired ? "bg-primary-dark text-white shadow-[0_18px_48px_rgba(20,42,71,0.16)]" : "border border-accent-strong/30 bg-pale-blush text-primary-dark") }>
        <div className={cn("flex size-11 items-center justify-center rounded-2xl", reviewRequired ? "bg-white/10 text-accent" : "bg-surface text-primary")}><ShieldCheck aria-hidden="true" size={22}/></div>
        <p className={cn("mt-5 text-xs font-bold uppercase tracking-[0.17em]", reviewRequired ? "text-accent" : "text-primary-hover")}>{t(reviewRequired ? "result.reviewEyebrow" : "result.discussEyebrow")}</p>
        <h2 id="result-title" className="mt-2 max-w-2xl font-display text-3xl font-semibold leading-tight sm:text-4xl">{t(reviewRequired ? "result.reviewTitle" : "result.discussTitle")}</h2>
        {reviewRequired ? <div className="mt-4 max-w-3xl space-y-2 text-sm leading-6 text-white/82">{outcome.decisionReasons.map((reason) => <p key={reason}>{t(`result.reasons.${reason}`)}</p>)}</div> : <><p className="mt-4 max-w-3xl leading-7 text-muted">{t("result.tirzepatideReason", {bmi: outcome.bmi?.toFixed(1) ?? "—", loss: outcome.targetWeightLossPercentage?.toFixed(1) ?? "—"})}</p><p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{t("result.discussCaution")}</p></>}
        <div className={cn("mt-5 flex items-start gap-3 rounded-2xl p-4 text-sm leading-6", reviewRequired ? "bg-white/[0.08] text-white/82" : "bg-surface/80 text-muted")}><Info className={cn("mt-0.5 shrink-0", reviewRequired ? "text-accent" : "text-primary")} aria-hidden="true" size={19}/><p>{t("result.disclaimer")}</p></div>
        {!reviewRequired && <div className="mt-4 flex flex-col items-start gap-1 min-[480px]:flex-row min-[480px]:flex-wrap min-[480px]:gap-x-5"><SourceLink href={sources.surmount}>{t("sources.surmount")}</SourceLink><SourceLink href={sources.step}>{t("sources.step")}</SourceLink><SourceLink href={sources.safety}>{t("sources.safety")}</SourceLink></div>}
      </section>

      <section aria-labelledby="review-title" className={cn("rounded-[1.75rem] border p-6 min-[375px]:p-7 sm:p-9 lg:grid lg:grid-cols-[1fr_auto] lg:items-end lg:gap-10", reportReady || reviewRequired ? "border-accent-strong/45 bg-pale-blush" : "border-primary/10 bg-surface")}>
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-hover">{t("review.eyebrow")}</p><h2 id="review-title" className="mt-2 font-display text-3xl font-semibold leading-tight text-primary-dark">{reviewTitle}</h2><p className="mt-3 max-w-2xl leading-7 text-muted">{reviewBody}</p></div>
        <div className="mt-6 min-w-0 lg:mt-0 lg:w-72">{reviewRequest ? <div className="rounded-2xl bg-surface p-4"><div className="flex min-h-11 items-center gap-2 text-sm font-bold text-primary"><CheckCircle2 aria-hidden="true" size={19}/>{reportReady ? memberAreaT("completedTitle") : t("review.requested")}</div><p className="mt-1 text-sm text-muted">{t("review.languageRecorded", {language: t(`review.languages.${reviewRequest.reportLanguage}`)})}</p></div> : <><fieldset><legend className="text-sm font-bold text-primary-dark">{t("review.languageLabel")}</legend><p className="mt-1 text-xs leading-5 text-muted">{t("review.languageHelp")}</p><div className="mt-3 grid grid-cols-2 rounded-full border border-primary/15 bg-background p-1">{(["en", "es"] as const).map((language) => <button key={language} type="button" aria-pressed={reportLanguage === language} onClick={() => setReportLanguage(language)} className={cn("min-h-11 rounded-full px-3 text-sm font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2", reportLanguage === language ? "bg-primary text-white shadow-sm" : "text-primary hover:bg-mist-blue")}>{t(`review.languages.${language}`)}</button>)}</div></fieldset><Button size="large" onClick={() => void requestReview()} disabled={requestState === "submitting"} className="mt-4 w-full">{requestState === "submitting" ? <LoaderCircle className="mr-2 animate-spin motion-reduce:animate-none" aria-hidden="true" size={18}/> : <ArrowUpRight className="mr-2" aria-hidden="true" size={18}/>} {requestState === "submitting" ? t("review.submitting") : t("review.button")}</Button></>}</div>
        {reportReady && reviewRequest?.reportId ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:col-span-2"><Link href={`/reports/${reviewRequest.reportId}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><ClipboardCheck aria-hidden="true" size={18}/>{memberAreaT("viewReport")}</Link><Link href="/messages" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-primary/20 bg-surface px-5 text-sm font-bold text-primary transition-colors hover:bg-mist-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><ArrowUpRight aria-hidden="true" size={18}/>{memberAreaT("sendMessage")}</Link></div> : null}
        {requestState === "error" && <p className="mt-4 rounded-xl bg-background px-4 py-3 text-sm font-semibold text-red-900 lg:col-span-2" role="alert">{t("review.error")}</p>}
      </section>
    </div>
  </main>;
}

function Metric({label, value}: {label: string; value: string}) { return <div className="min-w-0 rounded-2xl border border-primary/10 bg-surface p-4 shadow-[0_8px_24px_rgba(20,42,71,0.04)] sm:p-5"><dt className="text-[0.6875rem] font-bold uppercase leading-4 tracking-[0.1em] text-muted">{label}</dt><dd className="mt-2 break-words font-display text-2xl font-semibold text-primary-dark sm:text-3xl">{value}</dd></div>; }
function SummaryItem({label, value}: {label: string; value: string}) { return <div><dt className="text-sm font-bold text-primary-dark">{label}</dt><dd className="mt-1 text-sm leading-6 text-muted">{value}</dd></div>; }
function SourceLink({href, children}: {href: string; children: React.ReactNode}) { const t = useTranslations("assessmentResults.sources"); return <a href={href} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-semibold text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span>{children}</span><ExternalLink aria-hidden="true" size={15}/><span className="sr-only"> ({t("newTab")})</span></a>; }
