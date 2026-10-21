import Image from "next/image";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {redirect, Link} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";
import {requireMember} from "@/lib/authorization";
import {getCatalogueAccess} from "@/features/treatments/server";
import {formatPence, treatmentItems, treatmentPath} from "@/features/treatments/presentation";
import {getTreatmentPricing} from "@/features/pricing/server";
import semaglutideImage from "@/assets/images/Semaglutide Pen and Holographic Packaging.png";
import tirzepatideImage from "@/assets/images/Tirzepatide Injector Packaging Still Life.png";

export default async function CataloguePage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params; setRequestLocale(locale);
  const member = await requireMember(locale, "/treatments");
  const access = await getCatalogueAccess(member);
  if (!access.eligible) redirect({href: "/dashboard", locale});
  const t = await getTranslations("treatments");
  const pricing = await getTreatmentPricing().catch(() => null);
  return <main id="main-content" className="flex-1 bg-background">
    <section className="bg-primary-dark px-4 py-12 text-white sm:px-6 lg:px-10"><div className="mx-auto max-w-6xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-accent">{t("catalogueEyebrow")}</p><h1 className="mt-3 font-display text-4xl sm:text-5xl">{t("catalogue")}</h1><p className="mt-4 max-w-2xl leading-7 text-white/85">{t("catalogueIntro")}</p></div></section>
    <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6 lg:px-10"><div className="grid gap-6 md:grid-cols-2">{treatmentItems.map((item) => <article key={item} className="overflow-hidden rounded-[1.5rem] border border-border bg-surface shadow-[0_12px_35px_rgba(20,42,71,.06)]"><div className="relative aspect-[1.9] overflow-hidden bg-mist-blue"><Image src={item === "SEMAGLUTIDE" ? semaglutideImage : tirzepatideImage} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover object-top"/></div><div className="p-5 sm:p-7"><p className="text-xs text-muted">{t("conceptImage")}</p><h2 className="mt-4 font-display text-3xl text-primary-dark">{t(item === "SEMAGLUTIDE" ? "semaglutide" : "tirzepatide")}</h2><p className="mt-3 leading-7 text-muted">{t(item === "SEMAGLUTIDE" ? "semaglutideShort" : "tirzepatideShort")}</p><p className="mt-5 font-semibold text-primary">{pricing ? t("initialPrice", {price: formatPence(pricing.treatments[item][1], locale)}) : t("pricesUnavailable")}</p><Link href={`/treatments/${treatmentPath(item)}`} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 font-semibold text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">{t("learnMore")}</Link></div></article>)}</div><Link href="/treatments/prices" className="mt-8 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">{t("fullPrices")}</Link></div>
  </main>;
}
