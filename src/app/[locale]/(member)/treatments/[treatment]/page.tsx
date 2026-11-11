import Image from "next/image";
import {ArrowRight, ChevronDown, ShieldCheck} from "lucide-react";
import {notFound} from "next/navigation";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {redirect, Link} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";
import {requireMember} from "@/lib/authorization";
import {getCatalogueAccess} from "@/features/treatments/server";
import {formatPenceWithPoundSymbol, treatmentFromPath} from "@/features/treatments/presentation";
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
      <section className="mt-5 grid min-w-0 gap-6 overflow-hidden rounded-[1.8rem] border border-accent-strong/25 bg-pale-blush p-4 shadow-[0_16px_44px_rgba(20,42,71,0.07)] sm:p-7 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-10">
        <div className="p-1 sm:p-2">
          <p className="text-xs font-bold uppercase tracking-[.17em] text-primary-hover">{t("catalogueEyebrow")}</p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-primary-dark sm:text-5xl">{t(semaglutide ? "semaglutide" : "tirzepatide")}</h1>
          <p className="mt-4 max-w-xl leading-7 text-muted">{t(semaglutide ? "semaglutideShort" : "tirzepatideShort")}</p>
          <div className="mt-6 inline-block rounded-2xl border border-primary/10 bg-surface px-5 py-3"><p className="text-xs font-bold uppercase tracking-[0.1em] text-primary">{t("startingReference")}</p><p className="mt-1 font-display text-3xl font-semibold text-primary-dark">{pricing?.treatments[treatment][1] == null ? t("pricesUnavailable") : formatPenceWithPoundSymbol(pricing.treatments[treatment][1], locale)}</p><p className="mt-1 text-xs leading-5 text-muted">{t("cardReferenceNote")}</p></div>
          <Link href={`/treatments/${path}/request`} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 font-bold text-white shadow-[0_8px_22px_rgba(30,58,95,0.15)] transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto">{t("requestIt")}<ArrowRight aria-hidden="true" size={18}/></Link>
          <p className="mt-3 max-w-md text-xs leading-5 text-muted">{t("getItNowNote")}</p>
        </div>
        <figure><div className="box-border flex aspect-[4/3] items-center justify-center rounded-[1.5rem] bg-surface p-5 sm:p-7"><Image src={semaglutide ? semaglutideImage : tirzepatideImage} alt="" sizes="(max-width: 1024px) calc(100vw - 48px), 42vw" className="h-full w-full object-contain object-center"/></div><figcaption className="mt-2 text-xs leading-5 text-muted">{t("conceptImage")}</figcaption></figure>
      </section>
      <div className="mt-9 grid gap-4 md:grid-cols-2">{[["howWorks", semaglutide ? "semaglutideHow" : "tirzepatideHow"], ["evidence", semaglutide ? "semaglutideEvidence" : "tirzepatideEvidence"], ["precautions", "precautionsBody"], ["storage", "storageBody"]].map(([title, body]) => <details key={title} className="group rounded-[1.4rem] border border-primary/10 bg-surface p-5 shadow-[0_8px_28px_rgba(20,42,71,0.045)] sm:p-6"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden"><span className="font-display text-xl font-semibold sm:text-2xl">{t(title)}</span><ChevronDown aria-hidden="true" size={20} className="shrink-0 text-primary transition-transform motion-reduce:transition-none group-open:rotate-180"/></summary><p className="mt-4 border-t border-border pt-4 text-sm leading-7 text-muted">{t(body)}</p></details>)}</div>
      <details className="group mt-5 rounded-[1.4rem] border border-primary/10 bg-surface p-5 sm:p-6"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden"><span className="font-display text-xl font-semibold sm:text-2xl">{t("viewPriceStages")}</span><ChevronDown aria-hidden="true" size={20} className="shrink-0 text-primary transition-transform motion-reduce:transition-none group-open:rotate-180"/></summary><div className="mt-5"><DosePriceSchedule treatment={treatment} prices={pricing?.treatments[treatment] ?? null} locale={locale}/></div></details>
      <p className="mt-5 max-w-3xl text-sm leading-6 text-muted">{t("doseScheduleCaution")}</p>
      <p className="mt-3 flex max-w-3xl items-start gap-2 text-sm leading-6 text-muted"><ShieldCheck aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-primary"/>{t("priceScope")}</p>
      <div className="mt-8 flex flex-wrap gap-4"><Link href="/treatments/prices" className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">{t("fullPrices")}</Link><a href={semaglutide ? "https://www.ema.europa.eu/en/medicines/human/EPAR/wegovy" : "https://www.ema.europa.eu/en/medicines/human/EPAR/mounjaro"} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">{t("sources")}</a></div>
    </div>
  </main>;
}
