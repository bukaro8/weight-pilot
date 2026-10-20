"use client";

import {ArrowLeft, Calculator, Check, CirclePoundSterling, LoaderCircle, Save, Truck} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";
import {useMemo, useState, type FormEvent} from "react";

import {buttonVariants} from "@/components/ui/button";
import {
  defaultReferenceDuration,
  referenceDeliveryMethods,
  referenceDurations,
  referenceMonthTiers,
  referenceTreatments,
  type PricingBook,
  type PricingScenarios,
  type ReferenceDeliveryMethod,
  type ReferenceDuration,
  type ReferenceMonthTier,
  type ReferenceTreatment,
} from "@/features/pricing/types";
import {pricingUpdateSchema} from "@/features/pricing/validation";
import {Link} from "@/i18n/navigation";

type PriceInputState = {
  treatments: Record<ReferenceTreatment, Record<ReferenceMonthTier, string>>;
  delivery: Record<ReferenceDeliveryMethod, string>;
};

function toInputState(pricing: PricingBook): PriceInputState {
  return {
    treatments: Object.fromEntries(referenceTreatments.map((treatment) => [treatment, Object.fromEntries(
      referenceMonthTiers.map((month) => [month, (pricing.treatments[treatment][month] / 100).toFixed(2)]),
    )])) as PriceInputState["treatments"],
    delivery: Object.fromEntries(referenceDeliveryMethods.map((method) => [method, (pricing.delivery[method] / 100).toFixed(2)])) as PriceInputState["delivery"],
  };
}

function poundsToPence(value: string) {
  if (!/^\d+(?:\.\d{0,2})?$/.test(value)) return Number.NaN;
  return Math.round(Number(value) * 100);
}

export function PricingManagement({initialPricing, initialScenarios}: {initialPricing: PricingBook; initialScenarios: PricingScenarios}) {
  const t = useTranslations("adminPricing");
  const adminNav = useTranslations("adminNav");
  const locale = useLocale();
  const [inputs, setInputs] = useState(() => toInputState(initialPricing));
  const [pricing, setPricing] = useState(initialPricing);
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [duration, setDuration] = useState<ReferenceDuration>(defaultReferenceDuration);
  const [deliveryMethod, setDeliveryMethod] = useState<ReferenceDeliveryMethod>("STANDARD_NEXT_DAY");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<"success" | "error" | "validation">();
  const currency = useMemo(() => new Intl.NumberFormat(locale, {style: "currency", currency: "GBP"}), [locale]);
  const date = useMemo(() => new Intl.DateTimeFormat(locale, {dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London"}), [locale]);

  function updateTreatment(treatment: ReferenceTreatment, month: ReferenceMonthTier, value: string) {
    setMessage(undefined);
    setInputs((current) => ({...current, treatments: {...current.treatments, [treatment]: {...current.treatments[treatment], [month]: value}}}));
  }

  function updateDelivery(method: ReferenceDeliveryMethod, value: string) {
    setMessage(undefined);
    setInputs((current) => ({...current, delivery: {...current.delivery, [method]: value}}));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    const candidate = {
      treatments: Object.fromEntries(referenceTreatments.map((treatment) => [treatment, Object.fromEntries(
        referenceMonthTiers.map((month) => [month, poundsToPence(inputs.treatments[treatment][month])]),
      )])),
      delivery: Object.fromEntries(referenceDeliveryMethods.map((method) => [method, poundsToPence(inputs.delivery[method])])),
    };
    const parsed = pricingUpdateSchema.safeParse(candidate);
    if (!parsed.success) { setMessage("validation"); return; }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/pricing", {
        method: "PUT", headers: {"content-type": "application/json"}, body: JSON.stringify(parsed.data),
      });
      if (!response.ok) throw new Error();
      const saved = await response.json() as {pricing: PricingBook; scenarios: PricingScenarios};
      setPricing(saved.pricing);
      setInputs(toInputState(saved.pricing));
      setScenarios(saved.scenarios);
      setMessage("success");
    } catch { setMessage("error"); } finally { setSaving(false); }
  }

  return <main id="main-content" className="flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-10"><div className="mx-auto max-w-6xl">
    <Link href="/admin" className={`${buttonVariants({variant: "ghost"})} -ml-3`}><ArrowLeft className="mr-2" aria-hidden="true" size={17}/>{adminNav("dashboard")}</Link>
    <header className="mt-5 overflow-hidden rounded-[1.5rem] bg-primary-dark text-white"><div className="grid gap-7 p-6 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-end">
      <div><div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-accent"><CirclePoundSterling aria-hidden="true" size={25}/></div><p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-accent">{t("eyebrow")}</p><h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.025em] sm:text-5xl">{t("title")}</h1><p className="mt-4 max-w-2xl leading-7 text-white/75">{t("description")}</p></div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm"><p className="text-white/60">{t("lastUpdated")}</p><p className="mt-1 font-semibold text-white">{date.format(new Date(pricing.updatedAt))}</p></div>
    </div></header>

    <form onSubmit={save} className="mt-7 space-y-7" noValidate>
      <section aria-labelledby="treatment-prices-title"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-hover">{t("treatmentEyebrow")}</p><h2 id="treatment-prices-title" className="mt-2 font-display text-3xl font-semibold text-primary-dark">{t("treatmentTitle")}</h2></div><span className="hidden text-sm text-muted sm:block">{t("currencyNote")}</span></div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{t("treatmentBody")}</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">{referenceTreatments.map((treatment) => <fieldset key={treatment} className="rounded-2xl border border-border bg-surface p-5 shadow-[0_8px_25px_rgba(20,42,71,0.04)] sm:p-6"><legend className="px-1 font-display text-2xl font-semibold text-primary-dark">{t(`treatments.${treatment}`)}</legend><div className="mt-3 divide-y divide-border">{referenceMonthTiers.map((month) => <PriceRow key={month} id={`${treatment}-${month}`} label={month === 5 ? t("monthFivePlus") : t("month", {month})} value={inputs.treatments[treatment][month]} onChange={(value) => updateTreatment(treatment, month, value)}/>)}</div></fieldset>)}</div>
      </section>

      <section aria-labelledby="delivery-prices-title" className="rounded-[1.5rem] bg-mist-blue/65 p-5 sm:p-7"><div className="flex items-start gap-4"><div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-sm"><Truck aria-hidden="true" size={21}/></div><div><h2 id="delivery-prices-title" className="font-display text-3xl font-semibold text-primary-dark">{t("deliveryTitle")}</h2><p className="mt-2 text-sm leading-6 text-muted">{t("deliveryBody")}</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{referenceDeliveryMethods.map((method) => <label key={method} htmlFor={`delivery-${method}`} className="rounded-xl border border-primary/10 bg-surface p-4"><span className="block text-sm font-semibold text-primary-dark">{t(`delivery.${method}`)}</span><span className="relative mt-3 block"><span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-semibold text-muted">£</span><input id={`delivery-${method}`} type="number" inputMode="decimal" min="0" max="10000" step="0.01" required value={inputs.delivery[method]} onChange={(event) => updateDelivery(method, event.target.value)} className="h-12 w-full rounded-xl border border-border bg-background pl-9 pr-4 text-right text-base font-semibold text-primary-dark outline-none transition-[border-color,box-shadow] focus:border-primary/45 focus:ring-2 focus:ring-primary/15"/></span></label>)}</div></section>

      <div className="sticky bottom-3 z-20 rounded-2xl border border-primary/10 bg-background/95 p-3 shadow-[0_14px_40px_rgba(20,42,71,0.14)] backdrop-blur sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-4"><div className="min-h-6" aria-live="polite">{message && <p className={`text-sm font-semibold ${message === "success" ? "text-primary" : "text-red-800"}`}>{message === "success" && <Check className="mr-1.5 inline" aria-hidden="true" size={17}/>} {t(`states.${message}`)}</p>}</div><button type="submit" disabled={saving} className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(30,58,95,0.18)] transition-[background-color,box-shadow] hover:bg-primary-hover hover:shadow-[0_10px_28px_rgba(30,58,95,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 sm:mt-0 sm:w-auto">{saving ? <LoaderCircle className="mr-2 animate-spin motion-reduce:animate-none" aria-hidden="true" size={18}/> : <Save className="mr-2" aria-hidden="true" size={18}/>} {saving ? t("saving") : t("save")}</button></div>
    </form>

    <section className="mt-10 border-t border-border pt-9" aria-labelledby="calculator-title"><div className="grid gap-7 lg:grid-cols-[0.9fr_1.1fr] lg:items-start"><div><div className="flex size-11 items-center justify-center rounded-xl bg-pale-blush text-primary"><Calculator aria-hidden="true" size={21}/></div><p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-primary-hover">{t("calculatorEyebrow")}</p><h2 id="calculator-title" className="mt-2 font-display text-3xl font-semibold text-primary-dark">{t("calculatorTitle")}</h2><p className="mt-3 text-sm leading-6 text-muted">{t("calculatorBody")}</p><p className="mt-3 rounded-xl border border-accent-strong/25 bg-pale-blush/70 px-4 py-3 text-xs leading-5 text-muted">{t("calculatorDisclaimer")}</p></div><div className="rounded-2xl border border-border bg-surface p-5 sm:p-6"><div className="grid gap-5 sm:grid-cols-2"><ChoiceGroup label={t("durationLabel")}><div className="grid grid-cols-3 gap-2">{referenceDurations.map((item) => <ChoiceButton key={item} active={duration === item} onClick={() => setDuration(item)}>{t("duration", {months: item})}</ChoiceButton>)}</div></ChoiceGroup><ChoiceGroup label={t("deliveryLabel")}><div className="grid gap-2">{referenceDeliveryMethods.map((method) => <ChoiceButton key={method} active={deliveryMethod === method} onClick={() => setDeliveryMethod(method)}>{t(`delivery.${method}`)}</ChoiceButton>)}</div></ChoiceGroup></div><div className="mt-6 grid gap-3">{referenceTreatments.map((treatment) => {const result = scenarios[duration][treatment][deliveryMethod]; return <article key={treatment} className="rounded-xl bg-background p-4"><div className="flex items-baseline justify-between gap-4"><h3 className="font-display text-xl font-semibold text-primary-dark">{t(`treatments.${treatment}`)}</h3><p className="text-lg font-bold text-primary">{currency.format(result.totalCostPence / 100)}</p></div><dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm"><dt className="text-muted">{t("treatmentCost")}</dt><dd className="text-right font-semibold text-primary-dark">{currency.format(result.treatmentCostPence / 100)}</dd><dt className="text-muted">{t("deliveryCost")}</dt><dd className="text-right font-semibold text-primary-dark">{currency.format(result.deliveryCostPence / 100)}</dd></dl></article>;})}</div></div></div></section>
  </div></main>;
}

function PriceRow({id, label, value, onChange}: {id: string; label: string; value: string; onChange: (value: string) => void}) {
  return <label htmlFor={id} className="flex min-h-16 items-center justify-between gap-4 py-2.5"><span className="text-sm font-semibold text-primary-dark">{label}</span><span className="relative w-32 max-w-[48%]"><span className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-semibold text-muted">£</span><input id={id} type="number" inputMode="decimal" min="0.01" max="10000" step="0.01" required value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-background pl-8 pr-3 text-right font-semibold text-primary-dark outline-none transition-[border-color,box-shadow] focus:border-primary/45 focus:ring-2 focus:ring-primary/15"/></span></label>;
}

function ChoiceGroup({label, children}: {label: string; children: React.ReactNode}) { return <fieldset><legend className="mb-2 text-sm font-semibold text-primary-dark">{label}</legend>{children}</fieldset>; }
function ChoiceButton({active, onClick, children}: {active: boolean; onClick: () => void; children: React.ReactNode}) { return <button type="button" aria-pressed={active} onClick={onClick} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition-[color,background-color,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${active ? "border-primary bg-primary text-white" : "border-primary/15 bg-background text-primary hover:bg-mist-blue"}`}>{children}</button>; }
