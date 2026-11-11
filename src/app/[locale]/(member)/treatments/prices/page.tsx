import {getTranslations, setRequestLocale} from "next-intl/server";
import {ChevronDown} from "lucide-react";
import {redirect, Link} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";
import {requireMember} from "@/lib/authorization";
import {getCatalogueAccess} from "@/features/treatments/server";
import {getTreatmentPricing} from "@/features/pricing/server";
import {formatPenceWithPoundSymbol, treatmentItems} from "@/features/treatments/presentation";
import {DosePriceSchedule} from "@/components/treatments/dose-price-schedule";

export default async function PricesPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const member = await requireMember(locale, "/treatments/prices");
  if (!(await getCatalogueAccess(member)).eligible) redirect({href: "/dashboard", locale});
  const [t, pricing] = await Promise.all([getTranslations("treatments"), getTreatmentPricing().catch(() => null)]);

  return <main id="main-content" className="flex-1 bg-background">
    <div className="mx-auto max-w-5xl px-4 py-9 sm:px-6">
      <Link href="/treatments" className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">← {t("catalogue")}</Link>
      <h1 className="mt-5 font-display text-4xl text-primary-dark">{t("pricesTitle")}</h1>
      <p className="mt-4 max-w-3xl leading-7 text-muted">{t("pricesIntro")}</p>
      <div className="mt-7 grid gap-4 sm:grid-cols-2">{treatmentItems.map((item) => <article key={item} className="rounded-[1.5rem] border border-primary/10 bg-surface p-5 shadow-[0_10px_32px_rgba(20,42,71,0.05)] sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-hover">{t("startingReference")}</p><h2 className="mt-2 font-display text-2xl font-semibold text-primary-dark">{t(item === "SEMAGLUTIDE" ? "semaglutide" : "tirzepatide")}</h2><p className="mt-3 font-display text-4xl font-semibold text-primary-dark">{pricing?.treatments[item][1] == null ? t("pricesUnavailable") : formatPenceWithPoundSymbol(pricing.treatments[item][1], locale)}</p><p className="mt-2 text-xs leading-5 text-muted">{t("cardReferenceNote")}</p></article>)}</div>
      <details className="group mt-5 rounded-[1.5rem] border border-primary/10 bg-surface p-5 sm:p-6"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-display text-xl font-semibold text-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden"><span>{t("viewPriceStages")}</span><ChevronDown aria-hidden="true" size={20} className="shrink-0 transition-transform motion-reduce:transition-none group-open:rotate-180"/></summary><div className="mt-5 grid gap-5 lg:grid-cols-2">{treatmentItems.map((item) => <DosePriceSchedule key={item} treatment={item} prices={pricing?.treatments[item] ?? null} locale={locale}/>)}</div></details>
      <p className="mt-6 max-w-3xl text-sm leading-6 text-muted">{t("doseScheduleCaution")}</p>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{t("priceScope")}</p>
    </div>
  </main>;
}
