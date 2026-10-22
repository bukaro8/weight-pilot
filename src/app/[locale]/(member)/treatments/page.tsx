import {getTranslations, setRequestLocale} from "next-intl/server";
import {redirect, Link} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";
import {requireMember} from "@/lib/authorization";
import {getCatalogueAccess} from "@/features/treatments/server";
import {treatmentItems} from "@/features/treatments/presentation";
import {getTreatmentPricing} from "@/features/pricing/server";
import {TreatmentCard} from "@/components/treatments/treatment-card";

export default async function CataloguePage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params; setRequestLocale(locale);
  const member = await requireMember(locale, "/treatments");
  const access = await getCatalogueAccess(member);
  if (!access.eligible) redirect({href: "/dashboard", locale});
  const t = await getTranslations("treatments");
  const pricing = await getTreatmentPricing().catch(() => null);
  return <main id="main-content" className="flex-1 bg-background">
    <section className="bg-primary-dark px-4 py-12 text-white sm:px-6 lg:px-10"><div className="mx-auto max-w-6xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-accent">{t("catalogueEyebrow")}</p><h1 className="mt-3 font-display text-4xl sm:text-5xl">{t("catalogue")}</h1><p className="mt-4 max-w-2xl leading-7 text-white/85">{t("catalogueIntro")}</p></div></section>
    <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6 lg:px-10"><div className="grid gap-6 md:grid-cols-2">{treatmentItems.map((item) => <TreatmentCard key={item} treatment={item} pricePence={pricing?.treatments[item][1] ?? null} locale={locale} source="catalogue"/>)}</div><Link href="/treatments/prices" className="mt-8 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">{t("fullPrices")}</Link></div>
  </main>;
}
