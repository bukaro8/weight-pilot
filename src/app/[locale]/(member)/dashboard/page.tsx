import {ArrowRight, ClipboardList, FileText, MessageCircle, UsersRound} from "lucide-react";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {getFirstName} from "@/features/auth/name";
import {getMemberDashboardOverview} from "@/features/member-area/server";
import {Link, redirect} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";
import {requireMember} from "@/lib/authorization";

export default async function MemberDashboardPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const member = await requireMember(locale, "/dashboard");
  if (member.role === "ADMIN") redirect({href: "/admin", locale});
  const [data, t] = await Promise.all([getMemberDashboardOverview(member.id), getTranslations("memberArea.dashboard")]);
  const date = (value: string | null) => value ? new Intl.DateTimeFormat(locale, {dateStyle: "medium"}).format(new Date(value)) : null;
  const assessmentHref = data.assessmentStatus === "SUBMITTED" ? "/consultations/results" : "/consultations";
  const assessmentAction = data.assessmentStatus === "SUBMITTED" ? t("viewResults") : t("continueAssessment");
  const reportState = data.latestReport ? "ready" : data.reviewStatus === "IN_REVIEW" ? "inReview" : data.reviewStatus ? "pending" : "none";

  return <main id="main-content" className="flex-1 bg-background">
    <section className="bg-primary-dark px-4 py-10 text-white sm:px-6 sm:py-14 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{t("eyebrow")}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.025em] sm:text-5xl">{t("title", {name: getFirstName(member.name)})}</h1>
        <p className="mt-4 max-w-2xl leading-7 text-white/80">{t("description")}</p>
      </div>
    </section>
    <div className="mx-auto max-w-6xl space-y-9 px-4 py-8 sm:px-6 sm:py-11 lg:px-10">
      <section aria-label={t("quickLinks")} className="grid gap-4 md:grid-cols-3">
        <OverviewCard icon={<ClipboardList aria-hidden="true" size={21}/>} title={t("assessmentTitle")} value={t(`assessment.${data.assessmentStatus}`)} detail={data.assessmentUpdatedAt ? t("assessmentUpdated", {date: date(data.assessmentUpdatedAt) ?? ""}) : undefined} href={assessmentHref} action={assessmentAction}/>
        <OverviewCard icon={<FileText aria-hidden="true" size={21}/>} title={t("reportTitle")} value={t(`report.${reportState}`)} detail={data.latestReport ? t("assessmentUpdated", {date: date(data.latestReport.deliveredAt) ?? ""}) : undefined} href={data.latestReport ? `/reports/${data.latestReport.id}` : "/reports"} action={t("viewReports")}/>
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
