import Image from "next/image";
import {notFound} from "next/navigation";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {redirect, Link} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";
import {requireMember} from "@/lib/authorization";
import {getCatalogueAccess} from "@/features/treatments/server";
import {treatmentFromPath} from "@/features/treatments/presentation";
import {getTreatmentPricing} from "@/features/pricing/server";
import {DosePriceSchedule} from "@/components/treatments/dose-price-schedule";
import semaglutideImage from "@/assets/images/Semaglutide Pen and Holographic Packaging.png";
import tirzepatideImage from "@/assets/images/Tirzepatide Injector Packaging Still Life.png";

export default async function TreatmentPage({params}: {params: Promise<{locale: Locale; treatment: string}>}) {
  const {locale, treatment: path} = await params;
  setRequestLocale(locale);
  const member = await requireMember(locale, `/treatments/${path}`);
  const access = await getCatalogueAccess(member);
  if (!access.eligible) redirect({href: "/dashboard", locale});
  const treatment = treatmentFromPath(path);
  if (!treatment) notFound();
  const [t, pricing] = await Promise.all([getTranslations("treatments"), getTreatmentPricing().catch(() => null)]);
  const semaglutide = treatment === "SEMAGLUTIDE";

  return <main id="main-content" className="flex-1 bg-background">
    <div className="mx-auto max-w-5xl px-4 py-9 sm:px-6 lg:px-10">
      <Link href="/treatments" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4">← {t("catalogue")}</Link>
      <div className="mt-5 grid gap-7 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.17em] text-primary-hover">{t("catalogueEyebrow")}</p>
          <h1 className="mt-3 font-display text-4xl text-primary-dark sm:text-5xl">{t(semaglutide ? "semaglutide" : "tirzepatide")}</h1>
          <p className="mt-5 leading-7 text-muted">{t(semaglutide ? "semaglutideShort" : "tirzepatideShort")}</p>
          <Link href={`/treatments/${path}/request`} className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 font-bold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto">{t("requestIt")}</Link>
        </div>
        <div><div className="box-border flex aspect-[4/3] items-center justify-center rounded-[1.5rem] bg-background p-4 sm:p-6"><Image src={semaglutide ? semaglutideImage : tirzepatideImage} alt="" sizes="(max-width: 1024px) 100vw, 50vw" className="h-full w-full object-contain object-center"/></div><p className="mt-2 text-xs leading-5 text-muted">{t("conceptImage")}</p></div>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-2">{[["howWorks", semaglutide ? "semaglutideHow" : "tirzepatideHow"], ["evidence", semaglutide ? "semaglutideEvidence" : "tirzepatideEvidence"], ["precautions", "precautionsBody"], ["storage", "storageBody"]].map(([title, body]) => <section key={title} className="rounded-3xl border border-border bg-surface p-5 sm:p-7"><h2 className="font-display text-2xl text-primary-dark">{t(title)}</h2><p className="mt-3 leading-7 text-muted">{t(body)}</p></section>)}</div>
      <div className="mt-6"><DosePriceSchedule treatment={treatment} prices={pricing?.treatments[treatment] ?? null} locale={locale}/></div>
      <p className="mt-5 max-w-3xl text-sm leading-6 text-muted">{t("doseScheduleCaution")}</p>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{t("priceScope")}</p>
      <div className="mt-8 flex flex-wrap gap-4"><Link href="/treatments/prices" className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">{t("fullPrices")}</Link><a href={semaglutide ? "https://www.ema.europa.eu/en/medicines/human/EPAR/wegovy" : "https://www.ema.europa.eu/en/medicines/human/EPAR/mounjaro"} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">{t("sources")}</a></div>
    </div>
  </main>;
}
