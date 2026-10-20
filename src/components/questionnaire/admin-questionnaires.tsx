"use client";

import {ArrowLeft, ClipboardCheck, FileEdit, LoaderCircle, Trash2} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";
import {useMemo, useState} from "react";

import {buttonVariants} from "@/components/ui/button";
import type {ReviewRequestStatus} from "@/features/assessment/types";
import type {AdminQuestionnaireSubmission} from "@/features/questionnaire/types";
import {Link} from "@/i18n/navigation";

export function AdminQuestionnaires({initialSubmissions}: {initialSubmissions: AdminQuestionnaireSubmission[]}) {
  const t = useTranslations("adminQuestionnaires");
  const adminNav = useTranslations("adminNav");
  const locale = useLocale();
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [confirming, setConfirming] = useState<string>();
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const formatter = useMemo(() => new Intl.DateTimeFormat(locale, {dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London"}), [locale]);

  async function remove(id: string) {
    setBusy(id); setError(undefined);
    try {
      const response = await fetch(`/api/admin/questionnaires/${id}`, {method: "DELETE"});
      if (!response.ok) throw new Error();
      setSubmissions((current) => current.filter((item) => item.id !== id));
      setConfirming(undefined);
    } catch { setError(t("deleteError")); } finally { setBusy(undefined); }
  }

  async function updateStatus(item: AdminQuestionnaireSubmission, status: ReviewRequestStatus) {
    setBusy(item.reviewRequestId); setError(undefined);
    try {
      const response = await fetch(`/api/admin/review-requests/${item.reviewRequestId}`, {method: "PATCH", headers: {"content-type": "application/json"}, body: JSON.stringify({status})});
      if (!response.ok) throw new Error();
      setSubmissions((current) => current.map((entry) => entry.id === item.id ? {...entry, reviewStatus: status, reviewUpdatedAt: new Date().toISOString()} : entry));
    } catch { setError(t("statusError")); } finally { setBusy(undefined); }
  }

  return <main id="main-content" className="flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-10"><div className="mx-auto max-w-6xl">
    <Link href="/admin" className={`${buttonVariants({variant: "ghost"})} -ml-3`}><ArrowLeft className="mr-2" aria-hidden="true" size={17}/>{adminNav("dashboard")}</Link>
    <header className="mt-5 rounded-[1.5rem] bg-primary-dark p-6 text-white sm:p-9"><div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-accent"><ClipboardCheck aria-hidden="true" size={24}/></div><p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-accent">{t("eyebrow")}</p><h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.025em] sm:text-5xl">{t("title")}</h1><p className="mt-4 max-w-2xl leading-7 text-white/75">{t("description")}</p></header>
    {error && <p className="mt-6 rounded-xl bg-pale-blush px-4 py-3 text-sm font-semibold text-red-900" role="alert">{error}</p>}
    {submissions.length === 0 ? <div className="mt-7 rounded-2xl border border-dashed border-primary/20 bg-mist-blue/30 px-5 py-12 text-center"><ClipboardCheck className="mx-auto text-primary/60" aria-hidden="true" size={32}/><h2 className="mt-4 font-display text-2xl font-semibold text-primary-dark">{t("emptyTitle")}</h2><p className="mt-2 text-sm leading-6 text-muted">{t("emptyBody")}</p></div> : <div className="mt-7 grid gap-4 lg:grid-cols-2">{submissions.map((item) => <article key={item.id} className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-[0_8px_24px_rgba(20,42,71,0.04)] sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-2xl font-semibold text-primary-dark">{item.memberName}</h2><span className="rounded-full bg-pale-blush px-2 py-1 text-[0.6875rem] font-bold uppercase text-primary">{item.memberLanguage}</span></div><p className="mt-1 break-all text-xs text-muted">{item.memberEmail}</p></div><span className="rounded-full bg-mist-blue px-3 py-1.5 text-xs font-bold text-primary">{t(`status.${item.reviewStatus}`)}</span></div><p className="mt-4 text-sm text-muted">{t("requested", {date: formatter.format(new Date(item.reviewRequestedAt))})}</p><label htmlFor={`status-${item.id}`} className="mt-5 text-sm font-semibold text-primary-dark">{t("statusLabel")}</label><div className="relative mt-2"><select id={`status-${item.id}`} value={item.reviewStatus} disabled={busy === item.reviewRequestId} onChange={(event) => void updateStatus(item, event.target.value as ReviewRequestStatus)} className="min-h-11 w-full rounded-xl border border-primary/15 bg-background px-3 text-sm font-semibold text-primary-dark outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"><option value="REQUESTED">{t("status.REQUESTED")}</option><option value="IN_REVIEW">{t("status.IN_REVIEW")}</option>{item.reviewStatus === "COMPLETED" && <option value="COMPLETED">{t("status.COMPLETED")}</option>}</select>{busy === item.reviewRequestId && <LoaderCircle className="absolute right-10 top-3 animate-spin motion-reduce:animate-none text-primary" aria-hidden="true" size={18}/>}</div><div className="mt-6 flex flex-col gap-2 border-t border-border pt-5 sm:flex-row"><Link href={`/admin/questionnaires/${item.reviewRequestId}`} className={`${buttonVariants()} min-h-11 flex-1`}><FileEdit className="mr-2" aria-hidden="true" size={17}/>{t("openWorkspace")}</Link>{confirming === item.id ? <><button type="button" onClick={() => setConfirming(undefined)} className="min-h-11 rounded-full border border-primary/20 px-4 text-sm font-semibold text-primary">{t("cancel")}</button><button type="button" onClick={() => void remove(item.id)} disabled={busy === item.id} className="min-h-11 rounded-full bg-red-800 px-4 text-sm font-semibold text-white disabled:opacity-50">{t("confirmDelete")}</button></> : <button type="button" onClick={() => setConfirming(item.id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-red-800 transition-colors hover:bg-pale-blush focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Trash2 aria-hidden="true" size={17}/>{t("delete")}</button>}</div>{confirming === item.id && <p className="mt-3 text-xs leading-5 text-red-900">{t("deleteWarning")}</p>}</article>)}</div>}
  </div></main>;
}
