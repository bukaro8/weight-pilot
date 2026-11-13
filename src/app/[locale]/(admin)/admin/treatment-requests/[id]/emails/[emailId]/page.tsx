import {notFound} from "next/navigation";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {getTreatmentCommunication} from "@/features/treatments/communications";
import {Link} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";
import {requireAdmin} from "@/lib/authorization";
import {formatPenceWithPoundSymbol} from "@/features/treatments/presentation";

export default async function TreatmentEmailHistoryPage({params}: {params: Promise<{locale: Locale; id: string; emailId: string}>}) {
  const {locale, id, emailId} = await params;
  setRequestLocale(locale);
  const admin = await requireAdmin(locale, `/admin/treatment-requests/${id}/emails/${emailId}`);
  const email = await getTreatmentCommunication(admin.id, id, emailId);
  if (!email) notFound();
  const t = await getTranslations("treatments.communications");
  const date = new Intl.DateTimeFormat(locale, {dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London"});
  return <main id="main-content" className="mx-auto max-w-4xl px-4 py-9 sm:px-6"><Link href={`/admin/treatment-requests/${id}`} className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">← {t("backToRequest")}</Link><h1 className="mt-6 font-display text-4xl text-primary-dark">{t(`types.${email.type}`)}</h1><dl className="mt-5 grid gap-3 rounded-3xl border border-border bg-surface p-5 text-sm sm:grid-cols-2 sm:p-7"><div><dt className="text-muted">{t("sentAt")}</dt><dd className="mt-1 font-semibold text-primary-dark">{date.format(email.attemptedAt)}</dd></div><div><dt className="text-muted">{t("recipient")}</dt><dd className="mt-1 break-all font-semibold text-primary-dark">{email.recipient ?? t("notRecorded")}</dd></div><div><dt className="text-muted">{t("product")}</dt><dd className="mt-1 font-semibold text-primary-dark">{email.treatment ? `${t(`treatments.${email.treatment}`)} · ${email.strength ?? "—"}` : "—"}</dd></div><div><dt className="text-muted">{t("sending")}</dt><dd className="mt-1 font-semibold text-primary-dark">{t(`statuses.${email.sendStatus}`)}</dd></div><div><dt className="text-muted">{t("delivery")}</dt><dd className="mt-1 font-semibold text-primary-dark">{t(`deliveryStatuses.${email.deliveryStatus}`)}</dd></div>{email.totalPence !== null ? <div><dt className="text-muted">{t("amount")}</dt><dd className="mt-1 font-semibold text-primary-dark">{formatPenceWithPoundSymbol(email.totalPence, locale)}</dd></div> : null}</dl>{email.html ? <section className="mt-6"><h2 className="font-display text-2xl text-primary-dark">{t("savedContent")}</h2><p className="mt-2 text-sm text-muted">{t("savedContentNote")}</p><iframe title={t("savedContent")} srcDoc={email.html} sandbox="" className="mt-4 h-[650px] w-full rounded-2xl border border-border bg-white"/></section> : <p className="mt-6 rounded-2xl bg-pale-blush p-5 text-sm leading-6 text-primary-dark">{t("legacyContentUnavailable")}</p>}</main>;
}
