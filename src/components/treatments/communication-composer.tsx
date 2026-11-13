"use client";

import {useRef, useState} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {approvedStrengths, treatmentCommunicationSchema} from "@/features/treatments/validation";
import {formatPenceWithPoundSymbol, type Treatment} from "@/features/treatments/presentation";
import {Link} from "@/i18n/navigation";

type Authorisation = {id: string; treatment: Treatment; strength: string; verifiedAt: string};
type Preview = {recipient: string; subject: string; html: string; snapshot: {itemPricePence: number; deliveryPricePence: number; totalPence: number} | null};

export function CommunicationComposer({requestId, initialTreatment, initialStrength, language, status, authorisations}: {requestId: string; initialTreatment: Treatment; initialStrength: string; language: "en" | "es"; status: string; authorisations: Authorisation[]}) {
  const t = useTranslations("treatments.communications");
  const router = useRouter();
  const clientMessageId = useRef<string | null>(null);
  const [type, setType] = useState<"ADMIN_UPDATE" | "PAYMENT_INSTRUCTIONS">("ADMIN_UPDATE");
  const [treatment, setTreatment] = useState<Treatment>(initialTreatment);
  const [strength, setStrength] = useState(initialStrength);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const matching = authorisations.filter((item) => item.treatment === treatment && item.strength === strength);
  const [selectedAuthorisation, setSelectedAuthorisation] = useState("");
  const authorisationId = matching.some((item) => item.id === selectedAuthorisation) ? selectedAuthorisation : matching[0]?.id ?? null;
  function invalidate() {setPreview(null); setError("");}
  function payload() {
    clientMessageId.current ??= crypto.randomUUID();
    return {clientMessageId: clientMessageId.current, type, treatment, strength, message, authorisationId: type === "PAYMENT_INSTRUCTIONS" ? authorisationId : null};
  }
  function errorText(code: string | undefined) {
    const allowed = ["EMAIL_INVALID", "REQUEST_NOT_APPROVED", "MEMBER_NOT_VERIFIED", "SUPPLY_AUTHORISATION_REQUIRED", "BANK_DETAILS_NOT_CONFIGURED", "STRENGTH_PRICE_MISSING", "EMAIL_NOT_CONFIGURED", "EMAIL_ALREADY_QUEUED", "PRICE_CHANGED_REPREVIEW", "RECIPIENT_CHANGED", "EMAIL_PROVIDER_REJECTED", "EMAIL_SUBMISSION_UNCERTAIN"];
    return t(`errors.${code && allowed.includes(code) ? code : "GENERIC"}`);
  }
  async function prepare() {
    const candidate = payload();
    if (!treatmentCommunicationSchema.safeParse(candidate).success) {setError(t("invalid")); return;}
    setBusy(true); setError(""); setPreview(null);
    try {
      const response = await fetch(`/api/admin/treatment-requests/${requestId}/emails/preview`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(candidate)});
      const result = await response.json() as Preview & {error?: string};
      if (!response.ok) {setError(errorText(result.error)); return;}
      setPreview(result);
    } catch {setError(t("errors.GENERIC"));} finally {setBusy(false);}
  }
  async function send() {
    if (!preview || busy || !window.confirm(t("confirmSend", {recipient: preview.recipient}))) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/treatment-requests/${requestId}/emails`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(payload())});
      const result = await response.json() as {error?: string};
      if (!response.ok) {setError(errorText(result.error)); return;}
      router.push(`/admin/treatment-requests/${requestId}`); router.refresh();
    } catch {setError(t("errors.GENERIC"));} finally {setBusy(false);}
  }
  return <div className="mt-7 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]"><section className="rounded-3xl border border-border bg-surface p-5 sm:p-7"><h2 className="font-display text-2xl text-primary-dark">{t("details")}</h2><p className="mt-2 text-sm leading-6 text-muted">{t("recipientNote")}</p><div className="mt-5 space-y-4"><label className="block text-sm font-semibold text-primary-dark">{t("emailType")}<select value={type} onChange={(event) => {setType(event.target.value as typeof type); invalidate();}} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3 focus-visible:ring-2 focus-visible:ring-primary"><option value="ADMIN_UPDATE">{t("types.ADMIN_UPDATE")}</option><option value="PAYMENT_INSTRUCTIONS" disabled={status !== "APPROVED_FOR_NEXT_STEPS"}>{t("types.PAYMENT_INSTRUCTIONS")}</option></select></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-primary-dark">{t("product")}<select value={treatment} onChange={(event) => {const next = event.target.value as Treatment; setTreatment(next); setStrength(approvedStrengths[next][0]); setSelectedAuthorisation(""); invalidate();}} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3 focus-visible:ring-2 focus-visible:ring-primary"><option value="SEMAGLUTIDE">{t("treatments.SEMAGLUTIDE")}</option><option value="TIRZEPATIDE">{t("treatments.TIRZEPATIDE")}</option></select></label><label className="block text-sm font-semibold text-primary-dark">{t("strength")}<select value={strength} onChange={(event) => {setStrength(event.target.value); setSelectedAuthorisation(""); invalidate();}} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3 focus-visible:ring-2 focus-visible:ring-primary">{approvedStrengths[treatment].map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div>{type === "ADMIN_UPDATE" ? <label className="block text-sm font-semibold text-primary-dark">{t("message")}<textarea required minLength={5} maxLength={2000} rows={6} value={message} onChange={(event) => {setMessage(event.target.value); invalidate();}} className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-base font-normal focus-visible:ring-2 focus-visible:ring-primary"/></label> : <div className="rounded-2xl bg-pale-blush p-4 text-sm leading-6 text-primary-dark"><p className="font-semibold">{t("paymentGate")}</p>{matching.length ? <label className="mt-3 block font-semibold">{t("authorisationSelect")}<select value={authorisationId ?? ""} onChange={(event) => {setSelectedAuthorisation(event.target.value); invalidate();}} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-surface px-3 focus-visible:ring-2 focus-visible:ring-primary">{matching.map((item) => <option key={item.id} value={item.id}>{new Intl.DateTimeFormat(language, {dateStyle: "medium"}).format(new Date(item.verifiedAt))}</option>)}</select></label> : <p className="mt-2">{t("authorisationMissing")}</p>}<Link href={`/admin/treatment-requests/${requestId}/authorisation`} className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">{t("recordAuthorisation")}</Link></div>}<button type="button" disabled={busy} onClick={() => void prepare()} className="min-h-12 w-full rounded-full border border-primary px-6 font-semibold text-primary hover:bg-mist-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60">{busy ? t("working") : t("preview")}</button>{error ? <p role="alert" className="rounded-xl bg-pale-blush p-3 text-sm font-semibold text-red-800">{error}</p> : null}</div></section><section className="rounded-3xl border border-border bg-surface p-5 sm:p-7"><h2 className="font-display text-2xl text-primary-dark">{t("previewTitle")}</h2>{preview ? <><p className="mt-3 break-all text-sm text-muted">{t("recipient")}: <strong className="text-primary-dark">{preview.recipient}</strong></p><p className="mt-1 text-sm text-primary-dark">{preview.subject}</p>{preview.snapshot ? <p className="mt-3 rounded-xl bg-mist-blue p-3 text-sm font-semibold text-primary-dark">{t("amount")}: {formatPenceWithPoundSymbol(preview.snapshot.totalPence, language)}</p> : null}<iframe title={t("previewTitle")} srcDoc={preview.html} sandbox="" className="mt-4 h-[540px] w-full rounded-xl border border-border bg-white"/><button type="button" disabled={busy} onClick={() => void send()} className="mt-5 min-h-12 w-full rounded-full bg-primary px-6 font-semibold text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60">{busy ? t("working") : t("confirmAction")}</button></> : <p className="mt-5 rounded-2xl bg-mist-blue p-5 text-sm leading-6 text-primary-dark">{t("previewEmpty")}</p>}</section></div>;
}
