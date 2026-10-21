import {notFound} from "next/navigation";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {redirect, Link} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";
import {requireMember} from "@/lib/authorization";
import {getCatalogueAccess, getMemberRequest} from "@/features/treatments/server";

export default async function MemberRequestPage({params}: {params: Promise<{locale: Locale; id: string}>}) {
  const {locale, id} = await params; setRequestLocale(locale); const member = await requireMember(locale, `/requests/${id}`);
  if (!(await getCatalogueAccess(member)).eligible) redirect({href: "/dashboard", locale});
  const request = await getMemberRequest(member.id, id); if (!request) notFound(); const t = await getTranslations("treatments");
  return <main id="main-content" className="flex-1 bg-background"><div className="mx-auto max-w-3xl px-4 py-9 sm:px-6"><Link href="/requests" className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">← {t("myRequests")}</Link><h1 className="mt-5 font-display text-4xl text-primary-dark">{t(request.treatment === "SEMAGLUTIDE" ? "semaglutide" : "tirzepatide")}</h1><div className="mt-6 rounded-3xl border border-border bg-surface p-5 sm:p-7"><p className="text-sm font-bold uppercase tracking-[.12em] text-muted">{t("status")}</p><p className="mt-2 font-display text-2xl text-primary-dark">{t(request.status)}</p><p className="mt-3 text-sm leading-6 text-muted">{t("statusCaution")}</p><p className="mt-5 text-sm text-muted">{t("submittedAt", {date: new Intl.DateTimeFormat(locale, {dateStyle: "long"}).format(request.createdAt)})}</p>{request.declineReason ? <div className="mt-6 border-t border-border pt-5"><h2 className="font-semibold text-primary-dark">{t("adminResponse")}</h2><p className="mt-2 whitespace-pre-wrap break-words text-muted">{request.declineReason}</p></div> : null}</div>{request.status === "SUBMITTED" ? <p className="mt-6 text-sm leading-6 text-muted">{t("received")}</p> : null}<Link href="/messages" className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 font-semibold text-white hover:bg-primary-hover sm:w-auto">{t("messageAdmin")}</Link></div></main>;
}
