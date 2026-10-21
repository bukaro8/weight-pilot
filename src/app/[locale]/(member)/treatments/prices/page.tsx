import {getTranslations, setRequestLocale} from "next-intl/server";
import {redirect, Link} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";
import {requireMember} from "@/lib/authorization";
import {getCatalogueAccess} from "@/features/treatments/server";
import {getTreatmentPricing} from "@/features/pricing/server";
import {treatmentItems} from "@/features/treatments/presentation";
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
      <div className="mt-7 grid gap-5 lg:grid-cols-2">{treatmentItems.map((item) => <DosePriceSchedule key={item} treatment={item} prices={pricing?.treatments[item] ?? null} locale={locale}/>)}</div>
      <p className="mt-6 max-w-3xl text-sm leading-6 text-muted">{t("doseScheduleCaution")}</p>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{t("priceScope")}</p>
    </div>
  </main>;
}
