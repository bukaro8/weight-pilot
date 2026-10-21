"use client";

import {ArrowLeft, Check, CheckCircle2, Clipboard, FileEdit, LoaderCircle, Mail, Send, ShieldCheck} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";

import {buttonVariants} from "@/components/ui/button";
import type {ReportLanguage, ReportRecord, ReportReferenceScenario, ReportWorkspaceData} from "@/features/reports/types";
import {parseReportAssessment} from "@/features/reports/validation";
import {Link} from "@/i18n/navigation";

type SaveState = "saved" | "saving" | "error" | "invalid";

export function ReportWorkspace({initialWorkspace}: {initialWorkspace: ReportWorkspaceData}) {
  const t = useTranslations("adminReport");
  const tc = useTranslations("reportCost");
  const questionnaireT = useTranslations("questionnaire");
  const assessmentT = useTranslations("reportAssessment");
  const locale = useLocale();
  const [report, setReport] = useState(initialWorkspace.report);
  const [language, setLanguage] = useState<ReportLanguage>(report.language);
  const [content, setContent] = useState(report.content);
  const [referenceScenario, setReferenceScenario] = useState<ReportReferenceScenario | null>(report.referenceEstimate ? {
    treatment: report.referenceEstimate.treatment, durationMonths: report.referenceEstimate.durationMonths, deliveryMethod: report.referenceEstimate.deliveryMethod,
  } : null);
  const [pharmacyReferencePriceId, setPharmacyReferencePriceId] = useState(report.pharmacyEstimate?.referencePriceId ?? (report.pharmacyEstimate ? "legacy" : ""));
  const [prompt, setPrompt] = useState(initialWorkspace.prompt);
  const [previewHtml, setPreviewHtml] = useState(initialWorkspace.previewHtml);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string>();
  const lastSaved = useRef(JSON.stringify({language, content, referenceScenario, pharmacyReferencePriceId: pharmacyReferencePriceId === "legacy" ? null : pharmacyReferencePriceId || null, preserveExistingPharmacyEstimate: pharmacyReferencePriceId === "legacy"}));
  const editable = report.sendStatus === "DRAFT" || report.sendStatus === "FAILED";
  const parsedAssessment = parseReportAssessment(content);
  const assessmentValid = parsedAssessment.success;
  const formatter = useMemo(() => new Intl.DateTimeFormat(locale, {dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London"}), [locale]);

  const save = useCallback(async (nextLanguage: ReportLanguage, nextContent: string) => {
    if (!parseReportAssessment(nextContent).success) { setSaveState("invalid"); return false; }
    const payload = {language: nextLanguage, content: nextContent, referenceScenario, pharmacyReferencePriceId: pharmacyReferencePriceId === "legacy" ? null : pharmacyReferencePriceId || null, preserveExistingPharmacyEstimate: pharmacyReferencePriceId === "legacy"};
    const signature = JSON.stringify(payload);
    if (signature === lastSaved.current || !editable) return true;
    setSaveState("saving");
    try {
      const response = await fetch(`/api/admin/reports/${initialWorkspace.reviewRequestId}`, {method: "PUT", headers: {"content-type": "application/json"}, body: signature});
      if (!response.ok) throw new Error();
      const data = await response.json() as {report: ReportRecord; prompt: string; previewHtml: string};
      setReport(data.report); setPrompt(data.prompt); setPreviewHtml(data.previewHtml);
      lastSaved.current = signature; setSaveState("saved"); return data.prompt;
    } catch { setSaveState("error"); return false; }
  }, [editable, initialWorkspace.reviewRequestId, referenceScenario, pharmacyReferencePriceId]);

  useEffect(() => {
    const signature = JSON.stringify({language, content, referenceScenario, pharmacyReferencePriceId: pharmacyReferencePriceId === "legacy" ? null : pharmacyReferencePriceId || null, preserveExistingPharmacyEstimate: pharmacyReferencePriceId === "legacy"});
    if (!editable || signature === lastSaved.current) return;
    if (!parseReportAssessment(content).success) return;
    const timer = window.setTimeout(() => { void save(language, content); }, 800);
    return () => window.clearTimeout(timer);
  }, [content, editable, language, referenceScenario, pharmacyReferencePriceId, save]);

  async function copyPrompt() {
    try {
      const response = await fetch(`/api/admin/reports/${initialWorkspace.reviewRequestId}?language=${language}`, {cache: "no-store"});
      if (!response.ok) throw new Error();
      const data = await response.json() as {workspace: ReportWorkspaceData};
      setPrompt(data.workspace.prompt);
      await navigator.clipboard.writeText(data.workspace.prompt);
      setCopied(true); window.setTimeout(() => setCopied(false), 2200);
    }
    catch { setMessage(t("copyError")); }
  }

  async function sendReport() {
    setMessage(undefined);
    if (!assessmentValid) { setSaveState("invalid"); setMessage(assessmentT("invalidHelp")); return; }
    if (!(await save(language, content))) { setMessage(t("saveError")); return; }
    setSending(true);
    try {
      const response = await fetch(`/api/admin/reports/${initialWorkspace.reviewRequestId}/send`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({confirm: true})});
      const data = await response.json() as {report?: ReportRecord};
      if (!response.ok || !data.report) throw new Error();
      setReport(data.report); setConfirming(false); setMessage(t("sendAccepted"));
    } catch { setMessage(t("sendError")); } finally { setSending(false); }
  }

  function togglePharmacyReference(enabled: boolean) {
    if (!enabled) { setPharmacyReferencePriceId(""); return; }
    const first = initialWorkspace.pharmacyReferences.prices.find((price) => !referenceScenario || price.treatment === referenceScenario.treatment);
    if (first) { setReferenceScenario(null); setPharmacyReferencePriceId(first.id); }
  }

  const q = initialWorkspace.questionnaire;
  const a = initialWorkspace.assessment;
  return <main id="main-content" className="flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-10"><div className="mx-auto max-w-7xl">
    <Link href="/admin/questionnaires" className={`${buttonVariants({variant: "ghost"})} -ml-3`}><ArrowLeft aria-hidden="true" className="mr-2" size={17}/>{t("back")}</Link>
    <header className="mt-4 overflow-hidden rounded-[1.5rem] bg-primary-dark text-white shadow-[0_18px_50px_rgba(20,42,71,0.14)]"><div className="border-b border-white/10 p-6 sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{t("eyebrow")}</p><h1 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-[-0.025em] sm:text-5xl">{t("title")}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">{t("description")}</p></div><StatusBadge status={report.sendStatus} label={t(`delivery.${report.sendStatus}`)}/></div></div><div className="grid grid-cols-2 divide-x divide-white/10 sm:grid-cols-4">{["review", "research", "edit", "send"].map((step, index) => <div key={step} className="border-t border-white/10 px-4 py-4 sm:border-t-0"><span className="text-[0.6875rem] font-bold uppercase tracking-[0.15em] text-accent">{t("step", {number: index + 1})}</span><p className="mt-1 text-sm font-semibold">{t(`steps.${step}`)}</p></div>)}</div></header>
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"><div className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-[0_8px_24px_rgba(20,42,71,0.04)] sm:p-6"><SectionHeading icon={ShieldCheck} eyebrow={t("assessmentEyebrow")} title={t("assessmentTitle")}/><dl className="mt-5 grid gap-3 min-[420px]:grid-cols-2"><Data label={questionnaireT("about.age")} value={q.age === null ? t("notProvided") : String(q.age)}/><Data label={questionnaireT("about.sex")} value={q.sexAssignedAtBirth ? questionnaireT(`sex.${q.sexAssignedAtBirth}`) : t("notProvided")}/><Data label={t("height")} value={q.heightCm === null ? t("notProvided") : `${q.heightCm} cm`}/><Data label={t("currentWeight")} value={q.currentWeightKg === null ? t("notProvided") : `${q.currentWeightKg} kg`}/><Data label={t("targetWeight")} value={q.targetWeightKg === null ? t("notProvided") : `${q.targetWeightKg} kg`}/><Data label={t("bmi")} value={a.bmi === null ? t("notProvided") : a.bmi.toFixed(1)}/><Data label={t("targetLoss")} value={a.targetWeightLossPercentage === null ? t("notProvided") : `${a.targetWeightLossPercentage.toFixed(1)}%`}/></dl><InfoBlock title={t("health")}>{q.healthConditions.length ? q.healthConditions.map((item) => questionnaireT(`conditions.${item}`)).join(", ") : t("notProvided")}</InfoBlock><InfoBlock title={t("medication")}>{q.noMedication ? t("noMedication") : q.medications || t("notProvided")}</InfoBlock><InfoBlock title={t("findings")} accent>{a.considerations.length ? a.considerations.map((item) => t(`considerations.${item}`)).join(", ") : t("noFindings")}</InfoBlock></section>
      <section className="rounded-2xl border border-primary/15 bg-mist-blue/50 p-5 sm:p-6"><SectionHeading icon={Clipboard} eyebrow={t("promptEyebrow")} title={t("promptTitle")}/><p className="mt-3 text-sm leading-6 text-muted">{t("promptBody")}</p><pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-primary/10 bg-surface p-4 font-sans text-xs leading-5 text-text">{prompt}</pre><button type="button" onClick={() => void copyPrompt()} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto">{copied ? <Check className="mr-2" size={17}/> : <Clipboard className="mr-2" size={17}/>} {copied ? t("copied") : t("copyPrompt")}</button></section>
    </div><div className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-[0_8px_24px_rgba(20,42,71,0.04)] sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><SectionHeading icon={FileEdit} eyebrow={t("editorEyebrow")} title={t("editorTitle")}/><SaveIndicator state={saveState} labels={{saved: t("saved"), saving: t("saving"), error: t("saveError"), invalid: assessmentT("invalid")}}/></div><fieldset className="mt-5" disabled={!editable}><legend className="text-sm font-bold text-primary-dark">{t("reportLanguage")}</legend><div className="mt-2 inline-flex rounded-full border border-border bg-background p-1">{(["en", "es"] as const).map((item) => <button key={item} type="button" aria-pressed={language === item} onClick={() => setLanguage(item)} className={`min-h-11 min-w-14 rounded-full px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${language === item ? "bg-primary text-white" : "text-primary hover:bg-mist-blue"}`}>{item.toUpperCase()}</button>)}</div>
        <div className="mt-6 rounded-xl border border-primary/10 bg-background p-4"><h3 className="font-semibold text-primary-dark">{tc("referenceCostTitle")}</h3><p className="mt-1 text-xs leading-5 text-muted">{tc("referenceCostHelp")}</p><label className="mt-3 flex min-h-11 items-center gap-3 text-sm font-semibold text-primary-dark"><input type="checkbox" checked={Boolean(referenceScenario)} onChange={(event) => { if (event.target.checked) setPharmacyReferencePriceId(""); setReferenceScenario(event.target.checked ? {treatment: "SEMAGLUTIDE", durationMonths: 16, deliveryMethod: "STANDARD_NEXT_DAY"} : null); }} className="size-5 accent-[#1E3A5F]"/>{tc("includeReferenceCost")}</label>{referenceScenario && <div className="mt-3 grid gap-3 sm:grid-cols-3"><label className="text-xs font-semibold text-muted">{tc("treatment")}<select value={referenceScenario.treatment} onChange={(event) => { const treatment = event.target.value as ReportReferenceScenario["treatment"]; setReferenceScenario({...referenceScenario, treatment}); const selected = initialWorkspace.pharmacyReferences.prices.find((price) => price.id === pharmacyReferencePriceId); if (selected && selected.treatment !== treatment) setPharmacyReferencePriceId(""); }} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text"><option value="SEMAGLUTIDE">{tc("semaglutide")}</option><option value="TIRZEPATIDE">{tc("tirzepatide")}</option></select></label><label className="text-xs font-semibold text-muted">{tc("duration")}<select value={referenceScenario.durationMonths} onChange={(event) => setReferenceScenario({...referenceScenario, durationMonths: Number(event.target.value) as ReportReferenceScenario["durationMonths"]})} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text">{[6, 12, 16].map((duration) => <option key={duration} value={duration}>{duration} {tc("months")}</option>)}</select></label><label className="text-xs font-semibold text-muted">{tc("delivery")}<select value={referenceScenario.deliveryMethod} onChange={(event) => setReferenceScenario({...referenceScenario, deliveryMethod: event.target.value as ReportReferenceScenario["deliveryMethod"]})} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text"><option value="STANDARD_NEXT_DAY">{tc("standardDelivery")}</option><option value="GUARANTEED_NEXT_DAY">{tc("guaranteedDelivery")}</option></select></label></div>}{report.referenceEstimate && <p className="mt-3 text-sm font-bold text-primary-dark">{tc("referenceTotal", {amount: `£${(report.referenceEstimate.totalCostPence / 100).toFixed(2)}`})}</p>}</div>
        <div className="mt-4 rounded-xl border border-primary/10 bg-background p-4"><label className="flex min-h-11 items-center gap-3 font-semibold text-primary-dark"><input type="checkbox" checked={Boolean(pharmacyReferencePriceId)} onChange={(event) => togglePharmacyReference(event.target.checked)} className="size-5 accent-[#1E3A5F]"/>{tc("includePharmacyEstimate")}</label><p className="mt-1 text-xs leading-5 text-muted">{tc("pharmacyEstimateHelp")}</p>{referenceScenario && pharmacyReferencePriceId && <p className="mt-3 rounded-lg bg-pale-blush px-3 py-2 text-sm text-primary-dark">{tc("notComparable")}</p>}{pharmacyReferencePriceId === "legacy" && report.pharmacyEstimate && <p className="mt-3 rounded-lg bg-pale-blush px-3 py-2 text-sm text-primary-dark">{tc("legacyPharmacyEstimate", {source: report.pharmacyEstimate.sourceName, price: `£${(report.pharmacyEstimate.amountPence / 100).toFixed(2)}`})}</p>}{pharmacyReferencePriceId && pharmacyReferencePriceId !== "legacy" && <label className="mt-3 block text-sm font-semibold text-primary-dark">{tc("savedPharmacyPrice")}<select value={pharmacyReferencePriceId} onChange={(event) => setPharmacyReferencePriceId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text">{initialWorkspace.pharmacyReferences.prices.filter((price) => !referenceScenario || price.treatment === referenceScenario.treatment).map((price) => <option key={price.id} value={price.id}>{`${tc(price.treatment === "SEMAGLUTIDE" ? "semaglutide" : "tirzepatide")} · ${price.strength} · ${price.periodMonths} ${tc(price.periodMonths === 1 ? "month" : "months")} · £${(price.pricePence / 100).toFixed(2)}`}</option>)}</select></label>}</div>
        <label htmlFor="report-content" className="mt-5 block text-sm font-bold text-primary-dark">{t("reportLabel")}</label><p id="report-help" className="mt-1 text-xs leading-5 text-muted">{assessmentT("editorHelp")}</p><textarea id="report-content" aria-describedby="report-help" aria-invalid={content.trim().length > 0 && !assessmentValid} value={content} onChange={(event) => setContent(event.target.value)} rows={14} maxLength={30000} className="mt-3 w-full resize-y rounded-xl border border-primary/15 bg-background px-4 py-3 font-mono text-sm leading-6 text-text outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-65" placeholder={assessmentT("pastePlaceholder")}/><p className="mt-2 text-right text-xs text-muted">{t("characters", {count: content.length})}</p>{content.trim().length > 0 && !assessmentValid && <p role="alert" className="mt-2 rounded-lg bg-pale-blush px-3 py-2 text-sm text-primary-dark">{assessmentT("invalidHelp")}</p>}{parsedAssessment.success && <div className="mt-4 rounded-xl border border-primary/10 bg-mist-blue/60 p-4" aria-live="polite"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-wide text-muted">{assessmentT("treatment")}</p><p className="mt-1 text-lg font-semibold text-primary-dark">{assessmentT(`treatments.${parsedAssessment.data.recommendedTreatment}`)}</p></div><span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-primary-dark">{assessmentT(`confidenceLevels.${parsedAssessment.data.confidence}`)}</span></div><p className="mt-3 text-sm leading-6 text-text">{parsedAssessment.data.reason}</p><p className="mt-3 text-xs font-semibold text-primary-dark">{assessmentT("medicalReview")}: {parsedAssessment.data.requiresMedicalReview ? assessmentT("reviewRequired") : assessmentT("notRequired")}</p></div>}</fieldset>{!editable && <p className="mt-4 rounded-xl bg-mist-blue px-4 py-3 text-sm text-primary-dark">{t("locked")}</p>}</section>
      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_8px_24px_rgba(20,42,71,0.04)]"><div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-muted">{t("previewEyebrow")}</p><h2 className="mt-1 font-display text-2xl font-semibold text-primary-dark">{t("previewTitle")}</h2></div><Mail aria-hidden="true" className="text-primary" size={22}/></div><iframe title={t("previewTitle")} sandbox="" srcDoc={previewHtml} className="h-[620px] w-full bg-background"/></section>
      <section className="rounded-2xl bg-primary-dark p-5 text-white sm:p-6"><div className="flex items-start gap-3"><Send className="mt-1 shrink-0 text-accent" aria-hidden="true" size={22}/><div><h2 className="font-display text-2xl font-semibold">{t("sendTitle")}</h2><p className="mt-2 text-sm leading-6 text-white/75">{t("sendBody")}</p><p className="mt-3 break-all text-xs text-white/60">{t("recipient", {email: initialWorkspace.memberEmail})}</p></div></div>{message && <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-primary-dark" role="status">{message}</p>}{confirming ? <div className="mt-5 rounded-xl bg-white/10 p-4"><p className="font-semibold">{t("confirmTitle")}</p><p className="mt-1 text-sm leading-6 text-white/75">{t("confirmBody")}</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => setConfirming(false)} disabled={sending} className="min-h-11 rounded-full border border-white/30 px-5 text-sm font-bold hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">{t("cancel")}</button><button type="button" onClick={() => void sendReport()} disabled={sending || !content.trim()} className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-bold text-primary transition-colors hover:bg-accent disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{sending ? <LoaderCircle className="mr-2 animate-spin motion-reduce:animate-none" size={17}/> : <Send className="mr-2" size={17}/>} {sending ? t("sending") : t("confirmSend")}</button></div></div> : <button type="button" onClick={() => setConfirming(true)} disabled={!editable || !content.trim() || saveState === "saving"} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-sm font-bold text-primary-dark transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"><Send className="mr-2" size={17}/>{t("sendReport")}</button>}<div className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-white/60"><p>{t("consultationStatus", {status: t(`reviewStatus.${initialWorkspace.reviewStatus}`)})}</p>{report.acceptedAt && <p>{t("acceptedAt", {date: formatter.format(new Date(report.acceptedAt))})}</p>}{report.deliveredAt && <p>{t("deliveredAt", {date: formatter.format(new Date(report.deliveredAt))})}</p>}</div></section>
    </div></div>
  </div></main>;
}

function SectionHeading({icon: Icon, eyebrow, title}: {icon: typeof ShieldCheck; eyebrow: string; title: string}) { return <div className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-pale-blush text-primary"><Icon aria-hidden="true" size={20}/></span><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-muted">{eyebrow}</p><h2 className="mt-1 font-display text-2xl font-semibold text-primary-dark">{title}</h2></div></div>; }
function Data({label, value}: {label: string; value: string}) { return <div className="rounded-xl bg-background p-3"><dt className="text-xs font-semibold text-muted">{label}</dt><dd className="mt-1 font-semibold text-primary-dark">{value}</dd></div>; }
function InfoBlock({title, children, accent = false}: {title: string; children: React.ReactNode; accent?: boolean}) { return <div className={`mt-3 rounded-xl p-4 ${accent ? "border border-accent/70 bg-pale-blush/60" : "bg-background"}`}><h3 className="text-sm font-bold text-primary-dark">{title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{children}</p></div>; }
function StatusBadge({status, label}: {status: ReportRecord["sendStatus"]; label: string}) { return <span className={`inline-flex min-h-9 shrink-0 items-center self-start rounded-full px-3 text-xs font-bold ${status === "DELIVERED" ? "bg-emerald-100 text-emerald-900" : "bg-white/10 text-white"}`}>{status === "DELIVERED" && <CheckCircle2 className="mr-1.5" size={15}/>} {label}</span>; }
function SaveIndicator({state, labels}: {state: SaveState; labels: Record<SaveState, string>}) { return <span role="status" className={`inline-flex min-h-9 items-center self-start rounded-full px-3 text-xs font-bold ${state === "error" || state === "invalid" ? "bg-pale-blush text-red-900" : "bg-mist-blue text-primary"}`}>{state === "saving" ? <LoaderCircle className="mr-1.5 animate-spin motion-reduce:animate-none" size={14}/> : state === "saved" ? <Check className="mr-1.5" size={14}/> : null}{labels[state]}</span>; }
