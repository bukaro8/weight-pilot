"use client";

import Image from "next/image";
import {useTranslations} from "next-intl";

import {Link} from "@/i18n/navigation";
import {catalogueDoseStages} from "@/features/treatments/dose-stages";
import {formatPenceWithPoundSymbol, treatmentCardHref, type Treatment} from "@/features/treatments/presentation";
import semaglutideImage from "@/assets/images/Semaglutide Pen and Holographic Packaging.png";
import tirzepatideImage from "@/assets/images/Tirzepatide Injector Packaging Still Life.png";

type TreatmentCardProps = {
  treatment: Treatment;
  pricePence: number | null;
  locale: "en" | "es";
} & ({source: "catalogue"; reportId?: never} | {source: "report"; reportId: string});

export function TreatmentCard({treatment, pricePence, locale, source, reportId}: TreatmentCardProps) {
  const t = useTranslations("treatments");
  const semaglutide = treatment === "SEMAGLUTIDE";
  const name = t(semaglutide ? "semaglutide" : "tirzepatide");
  const doseLabel = catalogueDoseStages[treatment][0].strength;
  const Heading = source === "catalogue" ? "h2" : "h3";
  const href = treatmentCardHref(treatment, source, reportId);

  return <article className="group min-w-0 overflow-hidden rounded-[1.7rem] border border-primary/10 bg-surface shadow-[0_14px_40px_rgba(20,42,71,.07)] transition-[border-color,box-shadow,transform] duration-200 motion-reduce:transition-none hover:-translate-y-0.5 hover:border-accent-strong/45 hover:shadow-[0_20px_48px_rgba(20,42,71,.11)]">
    <div className="relative box-border flex aspect-[4/3] items-center justify-center bg-[linear-gradient(145deg,#ffffff_0%,#f6ece8_100%)] p-5 sm:p-7">
      <Image src={semaglutide ? semaglutideImage : tirzepatideImage} alt="" sizes="(max-width: 768px) calc(100vw - 48px), 42vw" className="h-full w-full object-contain object-center"/>
    </div>
    <div className="border-t border-primary/5 p-5 sm:p-7">
      <p className="text-xs text-muted">{t("conceptImage")}</p>
      <Heading className="mt-4 font-display text-[2rem] font-semibold leading-tight text-primary-dark">{name}</Heading>
      <p className="mt-2 text-sm leading-6 text-muted">{t(semaglutide ? "semaglutideShort" : "tirzepatideShort")}</p>
      <div className="mt-5 rounded-2xl border border-primary/8 bg-mist-blue/55 px-4 py-3"><p className="text-xs font-bold uppercase tracking-[0.09em] text-primary">{t("startingReference")}</p><p className="mt-1 font-display text-3xl font-semibold text-primary-dark">{pricePence === null ? t("pricesUnavailable") : formatPenceWithPoundSymbol(pricePence, locale)}</p><p className="mt-1 text-xs leading-5 text-muted">{t("exampleDose", {dose: doseLabel})}</p></div>
      <Link href={href} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-center font-semibold text-white shadow-[0_8px_20px_rgba(30,58,95,0.12)] transition-[background-color,box-shadow] motion-reduce:transition-none hover:bg-primary-hover hover:shadow-[0_12px_24px_rgba(30,58,95,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">{t(source === "report" ? "getItNow" : "moreInfo")}</Link>
      {source === "report" ? <p className="mt-3 text-center text-xs leading-5 text-muted">{t("getItNowNote")}</p> : null}
    </div>
  </article>;
}
