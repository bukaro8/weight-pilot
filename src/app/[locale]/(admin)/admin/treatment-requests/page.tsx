import {getTranslations, setRequestLocale} from "next-intl/server";
import {Link} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";
import {requireAdmin} from "@/lib/authorization";
import {getAdminRequests} from "@/features/treatments/server";

export default async function AdminRequestsPage({params, searchParams}: {params: Promise<{locale: Locale}>; searchParams: Promise<{status?: string}>}) {
  const {locale} = await params; setRequestLocale(locale); await requireAdmin(locale, "/admin/treatment-requests");
  const status = (await searchParams).status;
  const [requests, t] = await Promise.all([getAdminRequests(status), getTranslations("treatments")]);
  return <main id="main-content" className="mx-auto max-w-6xl px-4 py-9 sm:px-6 lg:px-10"><h1 className="font-display text-4xl text-primary-dark">{t("adminTitle")}</h1><p className="mt-3 text-muted">{t("adminIntro")}</p><nav aria-label={t("status")} className="mt-6 flex gap-2 overflow-x-auto pb-2">{["", "SUBMITTED", "UNDER_REVIEW", "APPROVED_FOR_NEXT_STEPS", "DECLINED", "CANCELLED"].map((item) => <Link key={item} href={item ? `/admin/treatment-requests?status=${item}` : "/admin/treatment-requests"} className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold ${status === item || (!status && !item) ? "border-primary bg-primary text-white" : "border-primary/15 bg-surface text-primary"}`}>{item ? t(item) : t("all")}</Link>)}</nav><div className="mt-5 grid gap-4">{requests.length ? requests.map(({request, memberName}) => <Link key={request.id} href={`/admin/treatment-requests/${request.id}`} className="block rounded-3xl border border-border bg-surface p-5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><h2 className="font-display text-2xl text-primary-dark">{memberName}</h2><p className="mt-2 text-sm text-muted">{t(request.treatment === "SEMAGLUTIDE" ? "semaglutide" : "tirzepatide")} · {t(request.status)} · {new Intl.DateTimeFormat(locale, {dateStyle: "medium"}).format(request.createdAt)}</p></Link>) : <p className="rounded-3xl border border-border bg-surface p-7 text-muted">{t("adminEmpty")}</p>}</div></main>;
}
