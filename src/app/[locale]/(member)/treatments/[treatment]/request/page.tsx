import {notFound} from "next/navigation";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {redirect, Link} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";
import {requireMember} from "@/lib/authorization";
import {getCatalogueAccess} from "@/features/treatments/server";
import {treatmentFromPath} from "@/features/treatments/presentation";
import {TreatmentRequestForm} from "@/components/treatments/request-form";

export default async function RequestPage({params}: {params: Promise<{locale: Locale; treatment: string}>}) {
  const {locale, treatment: path} = await params; setRequestLocale(locale);
  const member = await requireMember(locale, `/treatments/${path}/request`);
  const access = await getCatalogueAccess(member); if (!access.eligible || !access.reportId) redirect({href: "/dashboard", locale});
  const treatment = treatmentFromPath(path); if (!treatment) notFound();
  const t = await getTranslations("treatments");
  return <main id="main-content" className="flex-1 bg-background"><div className="mx-auto max-w-3xl px-4 py-9 sm:px-6"><Link href={`/treatments/${path}`} className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">← {t(treatment === "SEMAGLUTIDE" ? "semaglutide" : "tirzepatide")}</Link><h1 className="mt-5 font-display text-4xl text-primary-dark">{t("requestTitle")}</h1><p className="mt-4 max-w-2xl leading-7 text-muted">{t("requestIntro")}</p><TreatmentRequestForm name={member.name} reportId={access.reportId} treatment={treatment}/></div></main>;
}
