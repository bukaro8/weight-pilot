import {notFound} from "next/navigation";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {CommunicationComposer} from "@/components/treatments/communication-composer";
import {listSupplyAuthorisations} from "@/features/treatments/communications";
import {approvedStrengths} from "@/features/treatments/validation";
import {getAdminRequest} from "@/features/treatments/server";
import {Link} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";
import {requireAdmin} from "@/lib/authorization";

export default async function ComposeTreatmentEmailPage({params}: {params: Promise<{locale: Locale; id: string}>}) {
  const {locale, id} = await params;
  setRequestLocale(locale);
  const admin = await requireAdmin(locale, `/admin/treatment-requests/${id}/emails/new`);
  const detail = await getAdminRequest(id);
  if (!detail) notFound();
  const authorisations = await listSupplyAuthorisations(admin.id, id);
  const t = await getTranslations("treatments.communications");
  const treatment = detail.request.approvedTreatment ?? detail.request.treatment;
  const strength = detail.request.approvedStrength && (approvedStrengths[treatment] as readonly string[]).includes(detail.request.approvedStrength) ? detail.request.approvedStrength : approvedStrengths[treatment][0];
  return <main id="main-content" className="mx-auto max-w-6xl px-4 py-9 sm:px-6 lg:px-10"><Link href={`/admin/treatment-requests/${id}`} className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">← {t("backToRequest")}</Link><p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-primary-hover">{t("eyebrow")}</p><h1 className="mt-2 font-display text-4xl text-primary-dark">{t("compose")}</h1><p className="mt-3 max-w-3xl leading-7 text-muted">{t("composeIntro")}</p><CommunicationComposer requestId={id} initialTreatment={treatment} initialStrength={strength} language={detail.request.language} status={detail.request.status} authorisations={authorisations.map((item) => ({...item, verifiedAt: item.verifiedAt.toISOString()}))}/></main>;
}
