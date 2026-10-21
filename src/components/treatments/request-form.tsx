"use client";

import {useState} from "react";
import {useLocale, useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {createTreatmentRequestSchema} from "@/features/treatments/validation";
import type {Treatment} from "@/features/treatments/presentation";

export function TreatmentRequestForm({name, reportId, treatment}: {name: string; reportId: string; treatment: Treatment}) {
  const t = useTranslations("treatments"); const locale = useLocale() as "en" | "es"; const router = useRouter();
  const [clientRequestId] = useState(() => crypto.randomUUID());
  const [values, setValues] = useState({fullName: name, address: "", postcode: "", telephone: "", message: ""});
  const [reviewing, setReviewing] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const change = (key: keyof typeof values, value: string) => setValues((current) => ({...current, [key]: value}));
  const payload = {...values, clientRequestId, reportId, treatment, language: locale};
  const review = (event: React.FormEvent) => { event.preventDefault(); if (!createTreatmentRequestSchema.safeParse(payload).success) {setError(t("invalid")); return;} setError(""); setReviewing(true); };
  const submit = async () => { if (busy) return; setBusy(true); setError(""); try { const response = await fetch("/api/treatment-requests", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(payload)}); if (!response.ok) {setError(response.status === 429 ? t("rateLimited") : t("saveFailed")); return;} const data = await response.json() as {id: string}; router.push(`/requests/${data.id}`); router.refresh(); } catch {setError(t("saveFailed"));} finally {setBusy(false);} };
  return <form onSubmit={review} className="mt-7 rounded-[1.5rem] border border-border bg-surface p-5 shadow-[0_12px_35px_rgba(20,42,71,.05)] sm:p-8">
    {!reviewing ? <><div className="grid gap-5 sm:grid-cols-2"><Field label={t("fullName")} value={values.fullName} onChange={(v) => change("fullName", v)} autoComplete="name"/><Field label={t("telephone")} value={values.telephone} onChange={(v) => change("telephone", v)} autoComplete="tel" type="tel"/><Field label={t("address")} value={values.address} onChange={(v) => change("address", v)} autoComplete="street-address"/><Field label={t("postcode")} value={values.postcode} onChange={(v) => change("postcode", v)} autoComplete="postal-code"/></div><label className="mt-5 block text-sm font-semibold text-primary-dark">{t("optionalMessage")}<textarea value={values.message} maxLength={1000} onChange={(e) => change("message", e.target.value)} rows={4} className="mt-2 min-h-28 w-full rounded-xl border border-border bg-background p-3 text-base font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"/></label><button type="submit" className="mt-6 min-h-12 w-full rounded-full bg-primary px-6 font-semibold text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto">{t("continue")}</button></> : <><h2 className="font-display text-2xl text-primary-dark">{t("reviewDetails")}</h2><p className="mt-2 text-sm text-muted">{t("reviewNote")}</p><dl className="mt-5 divide-y divide-border break-words">{(["fullName", "address", "postcode", "telephone", "selectedTreatment", "optionalMessage"] as const).map((key) => <div key={key} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]"><dt className="font-semibold text-primary-dark">{t(key)}</dt><dd className="text-muted">{key === "selectedTreatment" ? t(treatment === "SEMAGLUTIDE" ? "semaglutide" : "tirzepatide") : key === "optionalMessage" ? values.message || "—" : values[key]}</dd></div>)}</dl><p className="mt-5 text-sm leading-6 text-muted">{t("requestIntro")}</p><div className="mt-6 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={() => setReviewing(false)} className="min-h-12 rounded-full border border-primary/20 px-6 font-semibold text-primary hover:bg-mist-blue">{t("back")}</button><button type="button" disabled={busy} onClick={() => void submit()} className="min-h-12 rounded-full bg-primary px-6 font-semibold text-white hover:bg-primary-hover disabled:opacity-60">{busy ? t("submitting") : t("submit")}</button></div></>}
    {error ? <p role="alert" className="mt-4 rounded-xl bg-pale-blush p-3 text-sm font-semibold text-primary-dark">{error}</p> : null}
  </form>;
}

function Field({label, value, onChange, autoComplete, type = "text"}: {label: string; value: string; onChange: (value: string) => void; autoComplete: string; type?: string}) {
  return <label className="block text-sm font-semibold text-primary-dark">{label}<input required value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} type={type} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3 text-base font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"/></label>;
}
