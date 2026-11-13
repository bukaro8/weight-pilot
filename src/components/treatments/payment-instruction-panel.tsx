"use client";

import {useState, type FormEvent} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {formatPenceWithPoundSymbol, type Treatment} from "@/features/treatments/presentation";
import {PAYMENT_DELIVERY_PENCE} from "@/features/treatments/payment";

export function PaymentInstructionPanel({id, treatment, strength, pricePence, sendStatus, snapshot}: {id: string; treatment: Treatment; strength: string; pricePence: number | null; sendStatus: string | null; snapshot: {itemPricePence: number; deliveryPricePence: number; totalPence: number} | null}) {
  const t = useTranslations("treatments.payment");
  const router = useRouter();
  const [prescriptionReference, setPrescriptionReference] = useState("");
  const [supplyAuthorisationReference, setSupplyAuthorisationReference] = useState("");
  const [prescribingVerified, setPrescribingVerified] = useState(false);
  const [supplyVerified, setSupplyVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(sendStatus === "ACCEPTED");
  const locked = Boolean(sendStatus) || sent;
  const item = snapshot?.itemPricePence ?? pricePence;
  const delivery = snapshot?.deliveryPricePence ?? PAYMENT_DELIVERY_PENCE;
  const total = snapshot?.totalPence ?? (pricePence === null ? null : pricePence + PAYMENT_DELIVERY_PENCE);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy || locked) return;
    if (!window.confirm(t("confirm"))) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/treatment-requests/${id}/payment`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({prescriptionReference, supplyAuthorisationReference, prescribingVerified, supplyVerified})});
      const result = await response.json() as {error?: string};
      if (!response.ok) {setMessage(t(`errors.${result.error && ["PAYMENT_AUTHORISATION_REQUIRED", "BANK_DETAILS_NOT_CONFIGURED", "EMAIL_NOT_CONFIGURED", "STRENGTH_PRICE_MISSING", "PAYMENT_ALREADY_SENT", "PAYMENT_ATTEMPT_EXISTS", "MEMBER_NOT_VERIFIED", "PAYMENT_EMAIL_REJECTED", "PAYMENT_SUBMISSION_UNCERTAIN"].includes(result.error) ? result.error : "GENERIC"}`)); router.refresh(); return;}
      setSent(true); setMessage(t("sent")); router.refresh();
    } catch {setMessage(t("errors.GENERIC"));} finally {setBusy(false);}
  }
  return <section className="rounded-3xl border border-border bg-surface p-5 sm:p-7"><h2 className="font-display text-2xl text-primary-dark">{t("title")}</h2><p className="mt-2 text-sm leading-6 text-muted">{t("description")}</p><div className="mt-5 rounded-2xl bg-pale-blush p-4 text-sm text-primary-dark"><p className="font-semibold">{treatment === "SEMAGLUTIDE" ? t("semaglutide") : t("tirzepatide")} · {strength}</p>{item !== null && total !== null ? <dl className="mt-3 grid grid-cols-2 gap-y-2"><dt>{t("item")}</dt><dd className="text-right font-semibold">{formatPenceWithPoundSymbol(item, "en")}</dd><dt>{t("delivery")}</dt><dd className="text-right font-semibold">{formatPenceWithPoundSymbol(delivery, "en")}</dd><dt className="border-t border-primary/20 pt-2 font-semibold">{t("total")}</dt><dd className="border-t border-primary/20 pt-2 text-right font-bold">{formatPenceWithPoundSymbol(total, "en")}</dd></dl> : <p className="mt-2 font-semibold text-red-800">{t("priceMissing")}</p>}</div>{sendStatus === "ACCEPTED" || sent ? <p role="status" className="mt-4 rounded-xl bg-mist-blue p-3 text-sm font-semibold text-primary-dark">{t("sent")}</p> : sendStatus ? <p role="alert" className="mt-4 rounded-xl bg-pale-blush p-3 text-sm text-primary-dark">{t(sendStatus === "FAILED" ? "failed" : sendStatus === "UNCERTAIN" ? "uncertain" : "inProgress")}</p> : <form onSubmit={(event) => void submit(event)} className="mt-5 space-y-4"><label className="block text-sm font-semibold text-primary-dark">{t("prescriptionReference")}<input required minLength={3} maxLength={160} value={prescriptionReference} onChange={(event) => setPrescriptionReference(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"/></label><label className="block text-sm font-semibold text-primary-dark">{t("supplyReference")}<input required minLength={3} maxLength={160} value={supplyAuthorisationReference} onChange={(event) => setSupplyAuthorisationReference(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"/></label><label className="flex min-h-11 items-start gap-3 text-sm text-primary-dark"><input type="checkbox" required checked={prescribingVerified} onChange={(event) => setPrescribingVerified(event.target.checked)} className="mt-1 size-5 accent-primary"/><span>{t("prescribingVerified")}</span></label><label className="flex min-h-11 items-start gap-3 text-sm text-primary-dark"><input type="checkbox" required checked={supplyVerified} onChange={(event) => setSupplyVerified(event.target.checked)} className="mt-1 size-5 accent-primary"/><span>{t("supplyVerified")}</span></label><button type="submit" disabled={busy || item === null} className="min-h-12 w-full rounded-full bg-primary px-6 font-semibold text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60">{busy ? t("sending") : t("send")}</button>{message && <p role="alert" className="rounded-xl bg-pale-blush p-3 text-sm font-semibold text-primary-dark">{message}</p>}</form>}</section>;
}
