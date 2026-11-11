import Image from "next/image";
import {ArrowRight, Check, ClipboardList, FileText, HeartHandshake, MessageCircle, ShieldCheck, Sparkles} from "lucide-react";
import {getTranslations, setRequestLocale} from "next-intl/server";

import semaglutideImage from "@/assets/images/Semaglutide Pen and Holographic Packaging.png";
import tirzepatideImage from "@/assets/images/Tirzepatide Injector Packaging Still Life.png";
import {EditorialPhoto} from "@/components/member-area/editorial-photo";
import {getMemberDashboardOverview} from "@/features/member-area/server";
import {Link, redirect} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";
import {requireMember} from "@/lib/authorization";

export default async function MemberDashboardPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const member = await requireMember(locale, "/dashboard");
  if (member.role === "ADMIN") redirect({href: "/admin", locale});
  const [data, t, treatments] = await Promise.all([
    getMemberDashboardOverview(member.id),
    getTranslations("memberArea.dashboardJourney"),
    getTranslations("treatments"),
  ]);
  const name = member.name.trim().split(/\s+/u)[0] || member.name;

  return <main id="main-content" className="min-w-0 flex-1 bg-background">
    {data.stage === "NEW" || data.stage === "DRAFT" ? <>
      <section className="mx-auto max-w-6xl px-4 pb-8 pt-7 sm:px-6 sm:pt-10 lg:px-10 lg:pt-14">
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,.94fr)] lg:items-stretch lg:gap-8">
          <div className="flex min-w-0 flex-col">
            <p className="text-xs font-bold uppercase tracking-[0.17em] text-primary-hover">{t("eyebrow")}</p>
            <h1 className="mt-3 font-display text-[2.55rem] font-semibold leading-[1.07] tracking-[-0.035em] text-primary-dark sm:text-5xl">{data.stage === "NEW" ? t("new.welcome") : t("draft.welcome", {name})}</h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-muted sm:text-lg">{t(data.stage === "NEW" ? "new.intro" : "draft.intro")}</p>
            <div className="mt-5 rounded-[1.6rem] bg-primary p-5 text-white shadow-[0_16px_40px_rgba(20,42,71,0.16)] sm:p-7 lg:mt-7">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-white/15 text-accent"><ClipboardList aria-hidden="true" size={23}/></div>
              {data.stage === "DRAFT" ? <p className="mt-4 text-xs font-bold uppercase tracking-[0.13em] text-accent">{t("draft.progress", {step: Math.min(Math.max(data.assessmentStep ?? 1, 1), 5)})}</p> : null}
              <h2 className="mt-3 font-display text-2xl font-semibold leading-tight sm:text-3xl">{t(data.stage === "NEW" ? "new.actionTitle" : "draft.actionTitle")}</h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-white/85">{t(data.stage === "NEW" ? "new.actionBody" : "draft.actionBody")}</p>
              <Link href="/consultations" className="mt-5 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-center text-sm font-bold text-primary-dark shadow-[0_8px_22px_rgba(0,0,0,0.1)] transition-[background-color,transform] motion-reduce:transition-none hover:-translate-y-0.5 hover:bg-pale-blush focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary sm:w-auto">{t(data.stage === "NEW" ? "new.action" : "draft.action")}<ArrowRight aria-hidden="true" size={18}/></Link>
              <p className="mt-4 flex items-center gap-2 text-xs font-medium text-white/85"><ShieldCheck aria-hidden="true" size={17}/>{t("new.privacy")}</p>
            </div>
          </div>
          <EditorialPhoto scene="morning" alt={t("photoAlt")} className="aspect-[16/10] w-full border border-accent-strong/20 shadow-[0_18px_42px_rgba(20,42,71,0.1)] lg:aspect-auto lg:min-h-[27rem]" priority/>
        </div>
      </section>
      <JourneySteps active={0}/>
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-7 sm:px-6 lg:px-10"><Link href="/#options" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline decoration-primary/25 underline-offset-4 hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{t("exploreGeneral")}<ArrowRight aria-hidden="true" size={17}/></Link></section>
    </> : data.stage === "AWAITING_REVIEW_REQUEST" ? <>
      <JourneyStatusHero icon={<ClipboardList aria-hidden="true" size={24}/>} eyebrow={t("eyebrow")} title={t("awaiting.title")} body={t("awaiting.body")} imageAlt={t("photoAlt")}/>
      <ActionArea primaryHref="/consultations/results" primaryLabel={t("awaiting.action")} secondaryHref="/messages" secondaryLabel={t("messageAction")}/>
    </> : data.stage === "REVIEW" ? <>
      <JourneyStatusHero icon={<HeartHandshake aria-hidden="true" size={24}/>} eyebrow={t("eyebrow")} title={t("review.title")} body={t("review.body")} imageAlt={t("photoAlt")}/>
      <JourneySteps active={1}/>
      <ActionArea primaryHref="/#options" primaryLabel={t("exploreGeneral")} secondaryHref="/messages" secondaryLabel={t("messageAction")}/>
    </> : data.stage === "REQUEST" && data.latestTreatmentRequest && data.latestReport ? <>
      <JourneyStatusHero icon={<FileText aria-hidden="true" size={24}/>} eyebrow={t("request.eyebrow")} title={t(`request.status.${data.latestTreatmentRequest.status}.title`)} body={t(`request.status.${data.latestTreatmentRequest.status}.body`)} imageAlt={t("photoAlt")}/>
      <ActionArea primaryHref={`/requests/${data.latestTreatmentRequest.id}`} primaryLabel={t("request.action")} secondaryHref="/messages" secondaryLabel={t("messageAction")} reportHref={`/reports/${data.latestReport.id}`} reportLabel={t("report.open")}/>
      <p className="mx-auto max-w-6xl px-4 pb-10 text-xs leading-5 text-muted sm:px-6 lg:px-10">{t("request.caution")}</p>
    </> : data.latestReport ? <>
      <section className="mx-auto max-w-6xl px-4 pb-8 pt-7 sm:px-6 sm:pt-10 lg:px-10 lg:pt-14">
        <div className="grid min-w-0 gap-6 overflow-hidden rounded-[1.8rem] border border-accent-strong/25 bg-pale-blush p-5 shadow-[0_16px_42px_rgba(20,42,71,0.08)] sm:p-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center lg:gap-10">
          <div className="min-w-0"><div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-white"><Sparkles aria-hidden="true" size={24}/></div><p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-primary-hover">{t("report.eyebrow")}</p><h1 className="mt-2 font-display text-3xl font-semibold leading-[1.1] text-primary-dark sm:text-4xl">{t("report.title")}</h1>
            {data.recommendedTreatment ? <><p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-primary-hover">{t("report.highlight")}</p><h2 className="mt-1 font-display text-3xl font-semibold text-primary-dark">{treatments(data.recommendedTreatment === "SEMAGLUTIDE" ? "semaglutide" : "tirzepatide")}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted">{t("report.treatmentBody")}</p></> : <p className="mt-5 max-w-xl text-sm leading-6 text-muted">{t("report.reviewBody")}</p>}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row"><Link href={`/reports/${data.latestReport.id}`} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">{t("report.open")}<ArrowRight aria-hidden="true" size={18}/></Link><Link href="/messages" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-primary/15 bg-surface px-6 text-sm font-semibold text-primary hover:bg-mist-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><MessageCircle aria-hidden="true" size={18}/>{t("messageAction")}</Link></div>
          </div>
          {data.recommendedTreatment ? <div className="flex aspect-[4/3] items-center justify-center rounded-[1.4rem] bg-surface p-5"><Image src={data.recommendedTreatment === "SEMAGLUTIDE" ? semaglutideImage : tirzepatideImage} alt="" sizes="(min-width: 1024px) 288px, calc(100vw - 72px)" className="h-full w-full object-contain"/></div> : <EditorialPhoto scene="morning" alt={t("photoAlt")} className="aspect-[16/10] w-full lg:aspect-[3/4]"/>}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-10"><Link href="/treatments" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4">{t("report.explore")}<ArrowRight aria-hidden="true" size={17}/></Link></section>
    </> : null}
  </main>;
}

function JourneyStatusHero({icon, eyebrow, title, body, imageAlt}: {icon: React.ReactNode; eyebrow: string; title: string; body: string; imageAlt: string}) {
  return <section className="mx-auto max-w-6xl px-4 pb-6 pt-7 sm:px-6 sm:pt-10 lg:px-10 lg:pt-14"><div className="grid min-w-0 gap-6 overflow-hidden rounded-[1.8rem] border border-primary/10 bg-surface p-5 shadow-[0_14px_38px_rgba(20,42,71,0.07)] sm:p-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center lg:gap-10"><div><div className="flex size-12 items-center justify-center rounded-2xl bg-pale-blush text-primary shadow-sm">{icon}</div><p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-primary-hover">{eyebrow}</p><h1 className="mt-2 font-display text-3xl font-semibold leading-[1.1] text-primary-dark sm:text-4xl">{title}</h1><p className="mt-4 max-w-xl text-sm leading-7 text-muted sm:text-base">{body}</p></div><EditorialPhoto scene="morning" alt={imageAlt} className="aspect-[16/10] w-full lg:aspect-[4/3]"/></div></section>;
}

async function JourneySteps({active}: {active: 0 | 1 | 2}) {
  const t = await getTranslations("memberArea.dashboardJourney");
  const icons = [ClipboardList, HeartHandshake, Sparkles] as const;
  return <section aria-label={t("steps.label")} className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-10"><ol className="grid gap-3 sm:grid-cols-3">{icons.map((Icon, index) => <li key={index} className="flex items-start gap-3 rounded-[1.3rem] border border-primary/10 bg-surface p-4 shadow-[0_7px_24px_rgba(20,42,71,0.04)]"><span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ${index === active ? "bg-primary text-white" : "bg-mist-blue text-primary"}`}><Icon aria-hidden="true" size={21}/></span><div><p className="text-[11px] font-bold uppercase tracking-[0.13em] text-primary-hover">{t("steps.step", {number: index + 1})}</p><h2 className="mt-1 font-display text-lg font-semibold leading-tight text-primary-dark">{t(`steps.${index + 1}.title`)}</h2><p className="mt-1 text-xs leading-5 text-muted">{t(`steps.${index + 1}.body`)}</p>{index === 0 && active >= 1 ? <Check aria-label={t("steps.complete")} size={16} className="mt-2 text-primary"/> : null}</div></li>)}</ol></section>;
}

function ActionArea({primaryHref, primaryLabel, secondaryHref, secondaryLabel, reportHref, reportLabel}: {primaryHref: string; primaryLabel: string; secondaryHref: string; secondaryLabel: string; reportHref?: string; reportLabel?: string}) {
  return <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 pb-8 pt-2 sm:flex-row sm:px-6 lg:px-10"><Link href={primaryHref} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-primary px-6 text-center text-sm font-bold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">{primaryLabel}<ArrowRight aria-hidden="true" size={18}/></Link><Link href={secondaryHref} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-primary/15 bg-surface px-6 text-center text-sm font-semibold text-primary transition-colors hover:bg-mist-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{secondaryLabel}</Link>{reportHref && reportLabel ? <Link href={reportHref} className="inline-flex min-h-13 items-center justify-center gap-2 text-sm font-semibold text-primary underline underline-offset-4">{reportLabel}<ArrowRight aria-hidden="true" size={17}/></Link> : null}</div>;
}
