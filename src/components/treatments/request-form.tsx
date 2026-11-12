"use client";

import {ArrowRight, CheckCircle2, Mail} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";
import {useState} from "react";

import {createTreatmentRequestSchema} from "@/features/treatments/validation";
import type {Treatment} from "@/features/treatments/presentation";
import {Link} from "@/i18n/navigation";

type DeliveryDetails = {
  fullName: string;
  telephone: string;
  streetAddress: string | null;
  flatNumber: string | null;
  buildingName: string | null;
  city: string | null;
  postcode: string;
};

export function TreatmentRequestForm({name, reportId, treatment, previous}: {
  name: string; reportId: string; treatment: Treatment; previous: DeliveryDetails | null;
}) {
  const t = useTranslations("treatments");
  const locale = useLocale() as "en" | "es";
  const [clientRequestId] = useState(() => crypto.randomUUID());
  const [values, setValues] = useState({
    fullName: previous?.fullName || name,
    telephone: previous?.telephone ?? "",
    streetAddress: previous?.streetAddress ?? "",
    flatNumber: previous?.flatNumber ?? "",
    buildingName: previous?.buildingName ?? "",
    city: previous?.city ?? "",
    postcode: previous?.postcode ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const change = (key: keyof typeof values, value: string) => setValues((current) => ({...current, [key]: value}));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || submittedId) return;
    const parsed = createTreatmentRequestSchema.safeParse({...values, clientRequestId, reportId, treatment, language: locale});
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      setError(field === "postcode" ? t("invalidPostcode") : field === "telephone" ? t("invalidTelephone") : t("invalid"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/treatment-requests", {
        method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(parsed.data),
      });
      if (!response.ok) {
        setError(response.status === 429 ? t("rateLimited") : response.status === 422 ? t("invalid") : t("saveFailed"));
        return;
      }
      const data = await response.json() as {id: string};
      setSubmittedId(data.id);
    } catch { setError(t("saveFailed")); }
    finally { setBusy(false); }
  }

  if (submittedId) return <section role="status" className="mt-7 rounded-[1.6rem] border border-accent-strong/40 bg-surface p-6 text-center shadow-[0_16px_40px_rgba(20,42,71,0.07)] sm:p-10">
    <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-pale-blush text-primary"><CheckCircle2 aria-hidden="true" size={28}/></span>
    <h2 className="mt-5 font-display text-3xl font-semibold text-primary-dark sm:text-4xl">{t("requestReceivedTitle")}</h2>
    <p className="mx-auto mt-3 max-w-lg text-base leading-7 text-muted">{t("requestReceivedBody")}</p>
    <Link href={`/requests/${submittedId}`} className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto">{t("viewRequest")}<ArrowRight aria-hidden="true" size={18}/></Link>
  </section>;

  return <form onSubmit={(event) => void submit(event)} className="mt-7 rounded-[1.5rem] border border-border bg-surface p-5 shadow-[0_12px_35px_rgba(20,42,71,.05)] sm:p-8">
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label={t("fullName")} value={values.fullName} onChange={(value) => change("fullName", value)} autoComplete="name" required maxLength={160} placeholder={t("fullNameExample")}/>
      <Field label={t("telephone")} value={values.telephone} onChange={(value) => change("telephone", value)} autoComplete="tel" type="tel" required maxLength={30} placeholder={t("telephoneExample")}/>
      <div className="sm:col-span-2"><Field label={t("streetAddress")} value={values.streetAddress} onChange={(value) => change("streetAddress", value)} autoComplete="address-line1" required maxLength={160} placeholder={t("streetExample")}/></div>
      <Field label={t("flatNumber")} value={values.flatNumber} onChange={(value) => change("flatNumber", value)} autoComplete="address-line2" maxLength={80} placeholder={t("flatExample")}/>
      <Field label={t("buildingName")} value={values.buildingName} onChange={(value) => change("buildingName", value)} autoComplete="off" maxLength={120} placeholder={t("buildingExample")}/>
      <Field label={t("city")} value={values.city} onChange={(value) => change("city", value)} autoComplete="address-level2" required maxLength={100} placeholder={t("cityExample")}/>
      <Field label={t("postcode")} value={values.postcode} onChange={(value) => change("postcode", value)} autoComplete="postal-code" required maxLength={9} placeholder={t("postcodeExample")}/>
    </div>
    <aside className="mt-7 rounded-[1.3rem] border border-accent-strong/40 bg-pale-blush p-5 sm:p-6">
      <div className="flex items-start gap-4"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-sm"><Mail aria-hidden="true" size={21}/></span><div><h2 className="font-display text-2xl font-semibold text-primary-dark">{t("whatNextTitle")}</h2><p className="mt-2 text-base leading-7 text-primary-dark">{t("whatNextMessage")}</p><p className="mt-2 text-sm leading-6 text-primary-dark/80">{t("whatNextSecondary")}</p></div></div>
    </aside>
    <p className="mt-5 text-sm leading-6 text-muted">{t("orderDisclaimer")}</p>
    {error ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-900">{error}</p> : null}
    <button type="submit" disabled={busy} aria-busy={busy} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-7 text-base font-bold text-white shadow-[0_8px_22px_rgba(30,58,95,0.14)] transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-65 motion-reduce:transition-none sm:w-auto">
      {t("orderNow")}<ArrowRight aria-hidden="true" size={19}/>
    </button>
  </form>;
}

function Field({label, value, onChange, autoComplete, required = false, type = "text", maxLength, placeholder}: {
  label: string; value: string; onChange: (value: string) => void; autoComplete: string; required?: boolean;
  type?: string; maxLength: number; placeholder: string;
}) {
  return <label className="block min-w-0 text-sm font-semibold text-primary-dark">{label}
    <input required={required} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} type={type} maxLength={maxLength} placeholder={placeholder} className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-border bg-background px-3.5 text-base font-normal text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/20 motion-reduce:transition-none"/>
  </label>;
}
