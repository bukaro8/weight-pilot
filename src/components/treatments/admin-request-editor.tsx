"use client";
import {useState} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {approvedStrengths, treatmentDecisionSchema, type UpdateTreatmentRequest} from "@/features/treatments/validation";
import type {Treatment} from "@/features/treatments/presentation";

type EditorValue = Omit<UpdateTreatmentRequest, "status"> & {status: UpdateTreatmentRequest["status"] | ""};

export function AdminRequestEditor({id, initial}: {id: string; initial: {status: string; internalNote: string; declineReason: string; approvedTreatment: Treatment | null; approvedStrength: string | null}}) {
  const t = useTranslations("treatments"); const router = useRouter();
  const [value, setValue] = useState<EditorValue>({
    status: initial.status === "APPROVED_FOR_NEXT_STEPS" || initial.status === "DECLINED" ? initial.status : "",
    internalNote: initial.internalNote,
    declineReason: initial.declineReason,
    approvedTreatment: initial.approvedTreatment,
    approvedStrength: initial.approvedStrength,
  });
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [failure, setFailure] = useState(false);
  const pending = initial.status === "SUBMITTED" || initial.status === "UNDER_REVIEW";
  const lockedApproval = initial.status === "APPROVED_FOR_NEXT_STEPS";
  const strengths = value.approvedTreatment ? approvedStrengths[value.approvedTreatment] : [];
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return;
    const parsed = treatmentDecisionSchema.safeParse(value);
    if (!parsed.success) {setFailure(true); setMessage(value.status ? t("decisionInvalid") : t("decisionRequired")); return;}
    setBusy(true); setMessage(""); setFailure(false);
    try {
      const response = await fetch(`/api/admin/treatment-requests/${id}`, {method: "PATCH", headers: {"content-type": "application/json"}, body: JSON.stringify(parsed.data)});
      const data = await response.json() as {error?: string; emailAccepted?: boolean; emailFailure?: string};
      if (!response.ok) {setFailure(true); setMessage(data.error === "REQUEST_ALREADY_FINAL" ? t("alreadyFinal") : t("saveFailed")); return;}
      if (parsed.data.status === "APPROVED_FOR_NEXT_STEPS" && !data.emailAccepted) {
        setFailure(true);
        setMessage(data.emailFailure === "NOT_CONFIGURED" ? t("approvalEmailNotConfigured") : data.emailFailure === "NOT_VERIFIED" ? t("approvalEmailNotVerified") : data.emailFailure === "REJECTED" ? t("approvalEmailRejected") : t("approvalEmailUncertain"));
        return;
      }
      router.push("/admin/treatment-requests"); router.refresh();
    } catch {setFailure(true); setMessage(t("saveFailed"));} finally {setBusy(false);}
  };
  return <form onSubmit={(event) => void save(event)} className="rounded-3xl border border-border bg-surface p-5 sm:p-7">
    <label className="block text-sm font-semibold text-primary-dark">{t("decision")}<select required value={value.status} disabled={!pending} onChange={(event) => setValue((current) => ({...current, status: event.target.value as EditorValue["status"]}))} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><option value="">{t("chooseDecision")}</option><option value="APPROVED_FOR_NEXT_STEPS">{t("approved")}</option><option value="DECLINED">{t("DECLINED")}</option></select></label>
    {value.status === "APPROVED_FOR_NEXT_STEPS" ? <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-primary-dark">{t("approvedProduct")}<select required disabled={lockedApproval} value={value.approvedTreatment ?? ""} onChange={(event) => {const treatment = event.target.value as Treatment; setValue((current) => ({...current, approvedTreatment: treatment, approvedStrength: approvedStrengths[treatment][0]}));}} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-70"><option value="">{t("chooseProduct")}</option><option value="SEMAGLUTIDE">{t("semaglutide")}</option><option value="TIRZEPATIDE">{t("tirzepatide")}</option></select></label><label className="block text-sm font-semibold text-primary-dark">{t("approvedStrength")}<select required disabled={lockedApproval || !strengths.length} value={value.approvedStrength ?? ""} onChange={(event) => setValue((current) => ({...current, approvedStrength: event.target.value}))} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-70"><option value="">{t("chooseStrength")}</option>{strengths.map((strength) => <option key={strength} value={strength}>{strength}</option>)}</select></label><p className="text-xs leading-5 text-muted sm:col-span-2">{t("strengthAdminNote")}</p></div> : null}
    <label className="mt-5 block text-sm font-semibold text-primary-dark">{t("internalNote")}<textarea value={value.internalNote} maxLength={2000} onChange={(event) => setValue((current) => ({...current, internalNote: event.target.value}))} rows={3} className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-base font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"/></label>
    {value.status === "DECLINED" ? <label className="mt-5 block text-sm font-semibold text-primary-dark">{t("declineReason")}<textarea required value={value.declineReason} maxLength={1000} onChange={(event) => setValue((current) => ({...current, declineReason: event.target.value}))} rows={3} className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-base font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"/></label> : null}
    <button type="submit" disabled={busy || (!pending && initial.status === "DECLINED")} className="mt-6 min-h-12 w-full rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 sm:w-auto">{busy ? t("sending") : t("send")}</button>{message ? <p role={failure ? "alert" : "status"} className={`mt-4 rounded-xl p-3 text-sm font-semibold ${failure ? "bg-pale-blush text-primary-dark" : "bg-mist-blue text-primary-dark"}`}>{message}</p> : null}<p className="mt-4 text-xs leading-5 text-muted">{t("notificationNote")}</p>
  </form>;
}
