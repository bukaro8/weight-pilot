import {ArrowRight, ClipboardList, FileText, MessageCircle, UsersRound} from "lucide-react";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {getFirstName} from "@/features/auth/name";
import {getMemberDashboardOverview} from "@/features/member-area/server";
import {getMemberReportCardState} from "@/features/member-area/report-state";
import {Link, redirect} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";
import {requireMember} from "@/lib/authorization";

export default async function MemberDashboardPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const member = await requireMember(locale, "/dashboard");
  if (member.role === "ADMIN") redirect({href: "/admin", locale});
  const [data, t, tt] = await Promise.all([getMemberDashboardOverview(member.id), getTranslations("memberArea.dashboard"), getTranslations("treatments")]);
  const date = (value: string | null) => value ? new Intl.DateTimeFormat(locale, {dateStyle: "medium"}).format(new Date(value)) : null;
  const assessmentHref = data.assessmentStatus === "SUBMITTED" ? "/consultations/results" : "/consultations";
  const assessmentAction = data.assessmentStatus === "SUBMITTED" ? t("viewResults") : t("continueAssessment");
  const reportState = getMemberReportCardState(Boolean(data.latestReport), data.reviewStatus);

  return <main id="main-content" className="flex-1 bg-background">
    <section className="bg-primary-dark px-4 py-10 text-white sm:px-6 sm:py-14 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{t("eyebrow")}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.025em] sm:text-5xl">{t("title", {name: getFirstName(member.name)})}</h1>
        <p className="mt-4 max-w-2xl leading-7 text-white/80">{t("description")}</p>
      </div>
    </section>
    <div className="mx-auto max-w-6xl space-y-9 px-4 py-8 sm:px-6 sm:py-11 lg:px-10">
      {reportState === "READY" && data.latestReport ? <section aria-labelledby="report-ready-title" className="relative overflow-hidden rounded-[1.75rem] border border-accent-strong/35 bg-pale-blush p-5 shadow-[0_18px_44px_rgba(20,42,71,0.09)] sm:p-8 lg:flex lg:items-center lg:justify-between lg:gap-10">
        <div className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full border-[24px] border-white/45" aria-hidden="true"/>
        <div className="relative min-w-0">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-white"><FileText aria-hidden="true" size={22}/></div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-primary-hover">{t("readyEyebrow")}</p>
          <h2 id="report-ready-title" className="mt-2 font-display text-3xl font-semibold leading-tight text-primary-dark sm:text-4xl">{t("readyTitle")}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">{t("readyBody", {date: date(data.latestReport.availableAt) ?? ""})}</p>
        </div>
        <div className="relative mt-6 flex w-full flex-col gap-3 sm:flex-row lg:mt-0 lg:w-auto lg:min-w-64 lg:flex-col">
          <Link href={`/reports/${data.latestReport.id}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">{t("viewLatestReport")}<ArrowRight aria-hidden="true" size={18}/></Link>
          <Link href="/messages" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-primary/20 bg-surface px-6 text-sm font-bold text-primary transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><MessageCircle aria-hidden="true" size={17}/>{t("messageAboutReport")}</Link>
        </div>
      </section> : reportState === "REQUESTED" || reportState === "IN_REVIEW" ? <section aria-live="polite" className="flex items-start gap-4 rounded-2xl border border-primary/10 bg-surface px-4 py-4 sm:px-6">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mist-blue text-primary"><FileText aria-hidden="true" size={19}/></div>
        <div className="min-w-0"><h2 className="font-display text-xl font-semibold text-primary-dark">{t(reportState === "REQUESTED" ? "requestedTitle" : "preparingTitle")}</h2><p className="mt-1 text-sm leading-6 text-muted">{t(reportState === "REQUESTED" ? "requestedBody" : "preparingBody")}</p></div>
      </section> : null}

      <section aria-labelledby="invite-friends-title" className="grid min-w-0 gap-6 overflow-hidden rounded-[1.75rem] border border-accent-strong/40 bg-pale-blush p-5 shadow-[0_12px_36px_rgba(20,42,71,0.06)] sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-10">
        <div className="min-w-0">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-white"><UsersRound aria-hidden="true" size={23}/></div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-primary-hover">{t("inviteEyebrow")}</p>
          <h2 id="invite-friends-title" className="mt-2 font-display text-3xl font-semibold leading-tight text-primary-dark sm:text-4xl">{t("inviteTitle")}</h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted sm:text-base">{t("inviteBody")}</p>
          <Link href="/invitations" className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-white transition-colors motion-reduce:transition-none hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto">{t("inviteAction")}<ArrowRight aria-hidden="true" size={18}/></Link>
        </div>
        <div className="min-w-0 rounded-2xl border border-primary/10 bg-surface/85 p-4 sm:p-6">
          <h3 className="font-display text-xl font-semibold text-primary-dark">{t("inviteHowTitle")}</h3>
          <ol className="mt-4 space-y-4">{(["inviteStepCreate", "inviteStepShare", "inviteStepJoin"] as const).map((step, index) => <li key={step} className="flex items-start gap-3 text-sm leading-6 text-foreground"><span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-mist-blue text-xs font-bold text-primary">{index + 1}</span><span className="min-w-0 pt-1">{t(step)}</span></li>)}</ol>
          <p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-muted">{t("inviteNote")}</p>
        </div>
      </section>

      {data.latestReport ? <section className="rounded-[1.5rem] border border-primary/10 bg-surface p-5 sm:p-7"><h2 className="font-display text-2xl text-primary-dark">{tt("dashboardNextTitle")}</h2><p className="mt-2 max-w-2xl leading-6 text-muted">{tt("dashboardNextBody")}</p><div className="mt-5 flex flex-col gap-3 sm:flex-row"><Link href="/treatments" className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 font-semibold text-white hover:bg-primary-hover">{tt("viewTreatments")}</Link><Link href="/requests" className="inline-flex min-h-12 items-center justify-center rounded-full border border-primary/20 px-6 font-semibold text-primary hover:bg-mist-blue">{tt("myRequests")}</Link></div></section> : null}

      <section aria-label={t("quickLinks")} className="grid gap-4 md:grid-cols-2">
        <OverviewCard icon={<ClipboardList aria-hidden="true" size={21}/>} title={t("assessmentTitle")} value={t(`assessment.${data.assessmentStatus}`)} detail={data.assessmentUpdatedAt ? t("assessmentUpdated", {date: date(data.assessmentUpdatedAt) ?? ""}) : undefined} href={assessmentHref} action={assessmentAction}/>
        <OverviewCard icon={<MessageCircle aria-hidden="true" size={21}/>} title={t("messagesTitle")} value={data.unreadMessages ? t("unread", {count: data.unreadMessages}) : t("noUnread")} href="/messages" action={t("openMessages")}/>
      </section>

      <section aria-labelledby="member-links-title" className="rounded-[1.5rem] border border-primary/10 bg-surface p-5 shadow-[0_12px_36px_rgba(20,42,71,0.05)] sm:p-7">
        <h2 id="member-links-title" className="font-display text-2xl font-semibold text-primary-dark">{t("quickLinks")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <QuickLink href="/reports" icon={<FileText aria-hidden="true" size={19}/>} label={t("reportsLink")}/>
          <QuickLink href="/messages" icon={<MessageCircle aria-hidden="true" size={19}/>} label={t("messagesLink")}/>
          <QuickLink href="/invitations" icon={<UsersRound aria-hidden="true" size={19}/>} label={t("invitationsLink")}/>
        </div>
      </section>
    </div>
  </main>;
}

function OverviewCard({icon, title, value, detail, href, action}: {icon: React.ReactNode; title: string; value: string; detail?: string; href: string; action: string}) {
  return <article className="flex min-w-0 flex-col rounded-[1.4rem] border border-primary/10 bg-surface p-5 shadow-[0_10px_30px_rgba(20,42,71,0.045)] sm:p-6">
    <div className="flex size-11 items-center justify-center rounded-2xl bg-mist-blue text-primary">{icon}</div>
    <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-muted">{title}</p>
    <p className="mt-2 font-display text-2xl font-semibold leading-tight text-primary-dark">{value}</p>
    {detail ? <p className="mt-2 min-h-5 text-sm text-muted">{detail}</p> : <div className="min-h-7"/>}
    <Link href={href} className="mt-5 inline-flex min-h-11 items-center gap-2 self-start rounded-full px-1 font-semibold text-primary underline decoration-primary/25 underline-offset-4 transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{action}<ArrowRight aria-hidden="true" size={17}/></Link>
  </article>;
}

function QuickLink({href, icon, label}: {href: string; icon: React.ReactNode; label: string}) {
  return <Link href={href} className="flex min-h-14 items-center gap-3 rounded-2xl border border-primary/10 bg-background px-4 font-semibold text-primary transition-colors hover:bg-mist-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="text-primary-hover">{icon}</span><span className="min-w-0 flex-1">{label}</span><ArrowRight aria-hidden="true" size={17}/></Link>;
}
