import {getTranslations, setRequestLocale} from "next-intl/server";
import {redirect, Link} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";
import {requireMember} from "@/lib/authorization";
import {getCatalogueAccess, getMemberRequests} from "@/features/treatments/server";

export default async function MemberRequestsPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params; setRequestLocale(locale); const member = await requireMember(locale, "/requests");
  if (!(await getCatalogueAccess(member)).eligible) redirect({href: "/dashboard", locale});
  const [requests, t] = await Promise.all([getMemberRequests(member.id), getTranslations("treatments")]);
  return <main id="main-content" className="flex-1 bg-background"><div className="mx-auto max-w-4xl px-4 py-9 sm:px-6"><h1 className="font-display text-4xl text-primary-dark">{t("myRequests")}</h1><p className="mt-3 leading-7 text-muted">{t("requestsIntro")}</p><div className="mt-8 grid gap-4">{requests.length ? requests.map((item) => <Link key={item.id} href={`/requests/${item.id}`} className="block rounded-3xl border border-border bg-surface p-5 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><h2 className="font-display text-2xl text-primary-dark">{t(item.treatment === "SEMAGLUTIDE" ? "semaglutide" : "tirzepatide")}</h2><p className="mt-2 text-sm text-muted">{t(item.status)} · {t("submittedAt", {date: new Intl.DateTimeFormat(locale, {dateStyle: "medium"}).format(item.createdAt)})}</p></Link>) : <p className="rounded-3xl border border-border bg-surface p-8 text-muted">{t("empty")}</p>}</div><Link href="/treatments" className="mt-7 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">{t("catalogue")}</Link></div></main>;
}
