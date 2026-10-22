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

  return <article className="overflow-hidden rounded-[1.5rem] border border-border bg-surface shadow-[0_12px_35px_rgba(20,42,71,.06)]">
    <div className="box-border flex aspect-[4/3] items-center justify-center bg-background p-4 sm:p-6">
      <Image src={semaglutide ? semaglutideImage : tirzepatideImage} alt="" sizes="(max-width: 768px) 100vw, 50vw" className="h-full w-full object-contain object-center"/>
    </div>
    <div className="p-5 sm:p-7">
      <p className="text-xs text-muted">{t("conceptImage")}</p>
      <Heading className="mt-4 font-display text-3xl text-primary-dark">{name}</Heading>
      <p className="mt-3 leading-7 text-muted">{t(semaglutide ? "semaglutideShort" : "tirzepatideShort")}</p>
      <p className="mt-5 font-semibold text-primary-dark">{pricePence === null ? t("pricesUnavailable") : t("cardReference", {dose: doseLabel, price: formatPenceWithPoundSymbol(pricePence, locale)})}</p>
      <p className="mt-1 text-xs leading-5 text-muted">{t("cardReferenceNote")}</p>
      <Link href={href} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-center font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">{t(source === "report" ? "getItNow" : "moreInfo")}</Link>
      {source === "report" ? <p className="mt-3 text-center text-xs leading-5 text-muted">{t("getItNowNote")}</p> : null}
    </div>
  </article>;
}
