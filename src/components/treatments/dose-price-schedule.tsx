import {getTranslations} from "next-intl/server";
import type {ReferenceMonthTier} from "@/features/pricing/types";
import {catalogueDosePriceRows} from "@/features/treatments/dose-stages";
import {formatPence, type Treatment} from "@/features/treatments/presentation";

export async function DosePriceSchedule({treatment, prices, locale}: {treatment: Treatment; prices: Record<ReferenceMonthTier, number> | null; locale: "en" | "es"}) {
  const t = await getTranslations("treatments");
  const rows = prices ? catalogueDosePriceRows(treatment, prices) : [];
  return <section aria-labelledby={`dose-schedule-${treatment}`} className="rounded-3xl border border-border bg-surface p-5 sm:p-7">
    <h2 id={`dose-schedule-${treatment}`} className="font-display text-2xl text-primary-dark">{t(treatment === "SEMAGLUTIDE" ? "semaglutide" : "tirzepatide")}</h2>
    <p className="mt-2 text-sm leading-6 text-muted">{t("doseScheduleIntro")}</p>
    {rows.length ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[16rem] text-left text-sm"><thead><tr className="border-b border-border text-primary-dark"><th scope="col" className="pb-3 pr-2 font-semibold">{t("illustrativeStage")}</th><th scope="col" className="pb-3 pr-2 font-semibold">{t("doseStrength")}</th><th scope="col" className="pb-3 text-right font-semibold">{t("referencePrice")}</th></tr></thead><tbody>{rows.map((row) => <tr key={row.period} className="border-b border-border/70 last:border-0"><th scope="row" className="py-3 pr-2 font-medium text-muted">{t(`dosePeriod.${row.period}`)}</th><td className="py-3 pr-2 font-semibold text-primary-dark">{row.strength}</td><td className="py-3 text-right font-semibold text-primary-dark">{formatPence(row.pricePence, locale)}</td></tr>)}</tbody></table></div> : <p className="mt-5 text-sm text-muted">{t("pricesUnavailable")}</p>}
    {treatment === "TIRZEPATIDE" ? <p className="mt-5 rounded-xl bg-mist-blue p-3 text-sm leading-6 text-primary-dark">{t("tirzepatideSharedTier")}</p> : null}
  </section>;
}
