import {ArrowRight, FileText} from "lucide-react";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {Link, redirect} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";
import {listMemberAvailableReports} from "@/features/reports/member";
import {requireMember} from "@/lib/authorization";

export default async function MemberReportsPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const member = await requireMember(locale, "/reports");
  if (member.role === "ADMIN") redirect({href: "/admin", locale});
  const [reports, t] = await Promise.all([listMemberAvailableReports(member.id), getTranslations("memberArea.reports")]);
  const formatDate = (value: string) => new Intl.DateTimeFormat(locale, {dateStyle: "medium"}).format(new Date(value));

  return <main id="main-content" className="flex-1 bg-background">
    <section className="bg-primary-dark px-4 py-10 text-white sm:px-6 sm:py-14 lg:px-10">
      <div className="mx-auto max-w-5xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{t("eyebrow")}</p><h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">{t("title")}</h1><p className="mt-4 max-w-2xl leading-7 text-white/80">{t("description")}</p></div>
    </section>
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-11 lg:px-10">
      {reports.length ? <ul className="space-y-4">{reports.map((report) => <li key={report.id}>
        <article className="rounded-[1.5rem] border border-primary/10 bg-surface p-5 shadow-[0_10px_30px_rgba(20,42,71,0.045)] sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
          <div className="flex min-w-0 items-start gap-4"><div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-mist-blue text-primary"><FileText aria-hidden="true" size={22}/></div><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{t("status")}</p><h2 className="mt-1 break-words font-display text-xl font-semibold text-primary-dark">{t("assessmentReference")}: <span className="font-sans text-base font-semibold">{report.assessmentReference}</span></h2><p className="mt-2 text-sm text-muted">{t("delivered", {date: formatDate(report.availableAt)})}</p></div></div>
          <Link href={`/reports/${report.id}`} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:mt-0 sm:w-auto sm:shrink-0">{t("open")}<ArrowRight aria-hidden="true" size={17}/></Link>
        </article>
      </li>)}</ul> : <section className="rounded-[1.5rem] border border-primary/10 bg-surface px-5 py-12 text-center shadow-[0_10px_30px_rgba(20,42,71,0.045)] sm:px-8"><div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-pale-blush text-primary"><FileText aria-hidden="true" size={25}/></div><h2 className="mt-5 font-display text-2xl font-semibold text-primary-dark">{t("emptyTitle")}</h2><p className="mx-auto mt-3 max-w-xl leading-7 text-muted">{t("emptyBody")}</p></section>}
    </div>
  </main>;
}
