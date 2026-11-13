"use client";

import {useState, type FormEvent} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {approvedStrengths, paymentAuthorisationSchema} from "@/features/treatments/validation";
import type {Treatment} from "@/features/treatments/presentation";

export function SupplyAuthorisationForm({requestId, initialTreatment, initialStrength}: {requestId: string; initialTreatment: Treatment; initialStrength: string}) {
  const t = useTranslations("treatments.communications");
  const router = useRouter();
  const [treatment, setTreatment] = useState<Treatment>(initialTreatment);
  const [strength, setStrength] = useState(initialStrength);
  const [prescriptionReference, setPrescriptionReference] = useState("");
  const [supplyAuthorisationReference, setSupplyAuthorisationReference] = useState("");
  const [prescribingVerified, setPrescribingVerified] = useState(false);
  const [supplyVerified, setSupplyVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = paymentAuthorisationSchema.safeParse({treatment, strength, prescriptionReference, supplyAuthorisationReference, prescribingVerified, supplyVerified});
    if (!parsed.success) {setError(t("authorisationInvalid")); return;}
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/treatment-requests/${requestId}/authorisations`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(parsed.data)});
      if (!response.ok) {setError(t("authorisationError")); return;}
      router.push(`/admin/treatment-requests/${requestId}/emails/new`); router.refresh();
    } catch {setError(t("authorisationError"));} finally {setBusy(false);}
  }
  return <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-5 rounded-3xl border border-border bg-surface p-5 sm:p-7"><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-primary-dark">{t("product")}<select value={treatment} onChange={(event) => {const next = event.target.value as Treatment; setTreatment(next); setStrength(approvedStrengths[next][0]);}} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3 focus-visible:ring-2 focus-visible:ring-primary"><option value="SEMAGLUTIDE">{t("treatments.SEMAGLUTIDE")}</option><option value="TIRZEPATIDE">{t("treatments.TIRZEPATIDE")}</option></select></label><label className="block text-sm font-semibold text-primary-dark">{t("strength")}<select value={strength} onChange={(event) => setStrength(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3 focus-visible:ring-2 focus-visible:ring-primary">{approvedStrengths[treatment].map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div><label className="block text-sm font-semibold text-primary-dark">{t("prescriptionReference")}<input required minLength={3} maxLength={160} value={prescriptionReference} onChange={(event) => setPrescriptionReference(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3 focus-visible:ring-2 focus-visible:ring-primary"/></label><label className="block text-sm font-semibold text-primary-dark">{t("supplyReference")}<input required minLength={3} maxLength={160} value={supplyAuthorisationReference} onChange={(event) => setSupplyAuthorisationReference(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3 focus-visible:ring-2 focus-visible:ring-primary"/></label><label className="flex min-h-11 items-start gap-3 text-sm leading-6 text-primary-dark"><input type="checkbox" required checked={prescribingVerified} onChange={(event) => setPrescribingVerified(event.target.checked)} className="mt-1 size-5 accent-primary"/><span>{t("prescribingVerified")}</span></label><label className="flex min-h-11 items-start gap-3 text-sm leading-6 text-primary-dark"><input type="checkbox" required checked={supplyVerified} onChange={(event) => setSupplyVerified(event.target.checked)} className="mt-1 size-5 accent-primary"/><span>{t("supplyVerified")}</span></label><button type="submit" disabled={busy} className="min-h-12 w-full rounded-full bg-primary px-6 font-semibold text-white hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 sm:w-auto">{busy ? t("saving") : t("recordAuthorisation")}</button>{error ? <p role="alert" className="rounded-xl bg-pale-blush p-3 text-sm text-red-800">{error}</p> : null}</form>;
}
