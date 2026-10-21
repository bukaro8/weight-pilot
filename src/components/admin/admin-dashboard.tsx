import {Activity, ArrowRight, CheckCircle2, ClipboardClock, Clock3, Plus, UserCheck, UserRoundX, Users} from "lucide-react";
import {getTranslations} from "next-intl/server";

import {buttonVariants} from "@/components/ui/button";
import type {AdminDashboardData} from "@/features/admin/types";
import {Link} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";

const statCards = [
  ["totalUsers", "totalUsers", Users],
  ["activeUsers", "activeUsers", UserCheck],
  ["inactiveUsers", "inactiveUsers", UserRoundX],
  ["requestedReviews", "requestedReviews", ClipboardClock],
  ["inReview", "inReview", Clock3],
  ["completedReviews", "completedReviews", CheckCircle2],
] as const;

export async function AdminDashboard({data, locale}: {data: AdminDashboardData; locale: Locale}) {
  const t = await getTranslations("adminDashboard");
  const tt = await getTranslations("treatments");
  const formatter = new Intl.DateTimeFormat(locale, {dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London"});

  return <main id="main-content" className="px-4 py-7 sm:px-6 sm:py-10 xl:px-10"><div className="mx-auto max-w-7xl">
    <header className="relative overflow-hidden rounded-[1.5rem] bg-primary-dark p-6 text-white shadow-[0_20px_50px_rgba(20,42,71,0.13)] sm:p-9"><div className="absolute -right-20 -top-24 size-64 rounded-full border border-white/10"/><div className="relative"><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{t("eyebrow")}</p><h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-5xl">{t("title")}</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-white/75 sm:text-base sm:leading-7">{t("description")}</p><div className="mt-6 flex flex-col gap-2 min-[430px]:flex-row"><Link href="/admin/questionnaires" className="inline-flex min-h-13 items-center justify-center rounded-full bg-accent px-7 text-base font-bold text-primary-dark shadow-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-dark">{t("reviewRequests")}<ArrowRight className="ml-2" aria-hidden="true" size={18}/></Link><Link href="/admin/invitations" className="inline-flex min-h-13 items-center justify-center rounded-full border border-white/20 px-5 text-sm font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Plus className="mr-2" aria-hidden="true" size={18}/>{t("createInvitation")}</Link></div></div></header>

    <Link href="/admin/treatment-requests" className="mt-6 inline-flex min-h-12 w-full items-center justify-between rounded-2xl border border-primary/10 bg-surface px-5 font-semibold text-primary shadow-sm hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-auto sm:gap-8">{tt("adminTitle")}<ArrowRight aria-hidden="true" size={18}/></Link>
    <section aria-labelledby="overview-title" className="mt-8"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-hover">{t("overviewEyebrow")}</p><h2 id="overview-title" className="mt-2 font-display text-3xl font-semibold text-primary-dark">{t("overviewTitle")}</h2></div><p className="hidden text-sm text-muted sm:block">{t("liveData")}</p></div><dl className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{statCards.map(([key, countKey, Icon]) => <div key={key} className="min-w-0 rounded-2xl border border-primary/10 bg-surface p-4 shadow-[0_8px_24px_rgba(20,42,71,0.04)] sm:p-5"><div className="flex size-9 items-center justify-center rounded-xl bg-mist-blue text-primary"><Icon aria-hidden="true" size={18}/></div><dd className="mt-4 font-display text-3xl font-semibold text-primary-dark">{data.counts[countKey]}</dd><dt className="mt-1 text-xs font-semibold leading-5 text-muted sm:text-sm">{t(`stats.${key}`)}</dt></div>)}</dl></section>

    <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.75fr)]">
      <section aria-labelledby="pending-title" className="rounded-[1.5rem] border border-primary/10 bg-surface p-5 shadow-[0_12px_32px_rgba(20,42,71,0.05)] sm:p-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-hover">{t("pendingEyebrow")}</p><h2 id="pending-title" className="mt-2 font-display text-3xl font-semibold text-primary-dark">{t("pendingTitle")}</h2></div><Link href="/admin/questionnaires" className={`${buttonVariants({variant: "ghost"})} -mr-2`}>{t("viewAll")}<ArrowRight className="ml-2" aria-hidden="true" size={16}/></Link></div>
        {data.pendingReviews.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-primary/20 bg-mist-blue/25 px-5 py-10 text-center"><CheckCircle2 className="mx-auto text-primary/55" aria-hidden="true" size={30}/><h3 className="mt-3 font-display text-xl font-semibold text-primary-dark">{t("pendingEmptyTitle")}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{t("pendingEmptyBody")}</p></div> : <div className="mt-6 divide-y divide-border">{data.pendingReviews.map((review) => <article key={review.id} className="grid gap-3 py-4 first:pt-0 min-[520px]:grid-cols-[minmax(0,1fr)_auto] min-[520px]:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold text-primary-dark">{review.memberName}</h3><span className="rounded-full bg-pale-blush px-2.5 py-1 text-xs font-bold uppercase text-primary">{review.language}</span></div><p className="mt-1 text-sm text-muted">{t("requestedAt", {date: formatter.format(new Date(review.requestedAt))})}</p></div><Link href={`/admin/questionnaires/${review.id}`} className={`${buttonVariants({variant: "secondary"})} w-full min-[520px]:w-auto`}>{t("openRequest")}</Link></article>)}</div>}
      </section>

      <section aria-labelledby="activity-title" className="rounded-[1.5rem] border border-primary/10 bg-mist-blue/45 p-5 sm:p-7"><div className="flex size-10 items-center justify-center rounded-xl bg-surface text-primary shadow-sm"><Activity aria-hidden="true" size={20}/></div><p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-primary-hover">{t("activityEyebrow")}</p><h2 id="activity-title" className="mt-2 font-display text-3xl font-semibold text-primary-dark">{t("activityTitle")}</h2>{data.recentActivity.length === 0 ? <p className="mt-5 text-sm leading-6 text-muted">{t("activityEmpty")}</p> : <ol className="mt-5 space-y-3">{data.recentActivity.map((item) => <li key={item.id}><Link href={item.href} className="block min-h-11 rounded-xl bg-surface px-4 py-3 shadow-sm transition-transform motion-reduce:transition-none hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><p className="text-sm font-semibold text-primary-dark">{t(item.type === "REGISTRATION" ? "activityRegistration" : "activityReview", {name: item.memberName})}</p><p className="mt-1 text-xs text-muted">{item.status ? `${t(`status.${item.status}`)} · ` : ""}{formatter.format(new Date(item.occurredAt))}</p></Link></li>)}</ol>}</section>
    </div>
  </div></main>;
}
