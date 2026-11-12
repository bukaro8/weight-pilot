"use client";

import {ArrowRight, BellOff, Clock3, LoaderCircle, Mail, Search, X} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";
import {useEffect, useMemo, useRef, useState} from "react";

import {getFirstName} from "@/features/auth/name";
import {defaultFollowUpText} from "@/features/follow-ups/template";
import type {FollowUpCandidate, FollowUpCategory} from "@/features/follow-ups/types";
import {cn} from "@/lib/utils";

type Draft = {candidate: FollowUpCandidate; language: "en" | "es"; subject: string; message: string; clientActionId: string};

export function AdminFollowUps({initialCandidates, publicUrlReady}: {initialCandidates: FollowUpCandidate[]; publicUrlReady: boolean}) {
  const t = useTranslations("adminFollowUps");
  const locale = useLocale();
  const [candidates, setCandidates] = useState(initialCandidates);
  const [tab, setTab] = useState<FollowUpCategory>("INCOMPLETE_ASSESSMENT");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmRecent, setConfirmRecent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyOptOut, setBusyOptOut] = useState<string | null>(null);
  const [message, setMessage] = useState<{key: string; error: boolean} | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogOpen = draft !== null;
  const date = useMemo(() => new Intl.DateTimeFormat(locale, {dateStyle: "medium", timeZone: "Europe/London"}), [locale]);

  useEffect(() => {
    if (!dialogOpen) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) setDraft(null);
      if (event.key !== "Tab") return;
      const controls = [...(document.getElementById("follow-up-dialog")?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled)') ?? [])];
      const first = controls.at(0); const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [dialogOpen, busy]);

  const visible = candidates.filter((candidate) => candidate.category === tab &&
    `${candidate.name} ${candidate.email}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const counts = {
    INCOMPLETE_ASSESSMENT: candidates.filter((candidate) => candidate.category === "INCOMPLETE_ASSESSMENT").length,
    TREATMENT_FOLLOW_UP: candidates.filter((candidate) => candidate.category === "TREATMENT_FOLLOW_UP").length,
  };

  function open(candidate: FollowUpCandidate) {
    const defaults = defaultFollowUpText(candidate.category, candidate.language, getFirstName(candidate.name));
    setDraft({...defaults, candidate, language: candidate.language, clientActionId: crypto.randomUUID()});
    setConfirmed(false); setConfirmRecent(false); setMessage(null);
  }

  function changeLanguage(language: "en" | "es") {
    if (!draft) return;
    const defaults = defaultFollowUpText(draft.candidate.category, language, getFirstName(draft.candidate.name));
    setDraft({...draft, ...defaults, language});
    setConfirmed(false);
  }

  async function send() {
    if (!draft || !confirmed || busy) return;
    setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/admin/follow-ups", {
        method: "POST", headers: {"content-type": "application/json"},
        body: JSON.stringify({
          memberId: draft.candidate.memberId, category: draft.candidate.category, clientActionId: draft.clientActionId,
          language: draft.language, subject: draft.subject, message: draft.message, confirmRecent, confirmed,
        }),
      });
      if (!response.ok) {
        const body = await response.json() as {error?: string};
        const key = body.error && ["RECENT_CONFIRMATION_REQUIRED", "RECENT_DUPLICATE", "RATE_LIMITED", "OPTED_OUT", "INELIGIBLE", "NOT_CONFIGURED", "PROVIDER_REJECTED", "DELIVERY_UNCERTAIN"].includes(body.error)
          ? body.error : "SEND_FAILED";
        if (key === "PROVIDER_REJECTED") setDraft((current) => current ? {...current, clientActionId: crypto.randomUUID()} : null);
        setMessage({key, error: true});
        return;
      }
      setCandidates((current) => current.map((candidate) => candidate.memberId === draft.candidate.memberId && candidate.category === draft.candidate.category
        ? {...candidate, reminderCount: candidate.reminderCount + 1, lastReminderAt: new Date().toISOString(), recentReminder: true} : candidate));
      setDraft(null);
      setMessage({key: "SENT", error: false});
    } catch { setMessage({key: "SEND_FAILED", error: true}); }
    finally { setBusy(false); }
  }

  async function toggleOptOut(candidate: FollowUpCandidate) {
    setBusyOptOut(candidate.memberId); setMessage(null);
    try {
      const response = await fetch("/api/admin/follow-ups/opt-out", {
        method: "PATCH", headers: {"content-type": "application/json"},
        body: JSON.stringify({memberId: candidate.memberId, doNotRemind: !candidate.doNotRemind}),
      });
      if (!response.ok) throw new Error("OPT_OUT_FAILED");
      setCandidates((current) => current.map((item) => item.memberId === candidate.memberId ? {...item, doNotRemind: !candidate.doNotRemind} : item));
      setMessage({key: candidate.doNotRemind ? "REMINDERS_ALLOWED" : "REMINDERS_DISABLED", error: false});
    } catch { setMessage({key: "OPT_OUT_FAILED", error: true}); }
    finally { setBusyOptOut(null); }
  }

  return <>
    {!publicUrlReady ? <p role="alert" className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-950">{t("publicUrlMissing")}</p> : null}
    {message && !draft ? <p role={message.error ? "alert" : "status"} className={cn("mt-6 rounded-2xl border px-5 py-4 text-sm font-semibold", message.error ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900")}>{t(`states.${message.key}`)}</p> : null}
    <section className="mt-7 rounded-[1.5rem] border border-primary/10 bg-surface p-4 shadow-[0_10px_30px_rgba(20,42,71,0.04)] sm:p-6">
      <div role="tablist" aria-label={t("tabsLabel")} className="grid grid-cols-2 gap-2 rounded-2xl bg-mist-blue p-1.5">{(["INCOMPLETE_ASSESSMENT", "TREATMENT_FOLLOW_UP"] as const).map((category) => <button key={category} id={`tab-${category}`} role="tab" type="button" aria-selected={tab === category} aria-controls="follow-up-panel" onClick={() => setTab(category)} className={cn("min-h-12 rounded-xl px-2 py-2 text-center text-xs font-bold leading-5 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm", tab === category ? "bg-primary text-white shadow-sm" : "text-primary hover:bg-surface")}>{t(`tabs.${category}`)} <span className="ml-1 tabular-nums">{counts[category]}</span></button>)}</div>
      <label htmlFor="follow-up-search" className="mt-6 block text-sm font-semibold text-primary-dark">{t("searchLabel")}</label>
      <div className="relative mt-2"><Search aria-hidden="true" size={18} className="absolute left-4 top-3.5 text-muted"/><input id="follow-up-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("searchPlaceholder")} className="min-h-12 w-full rounded-xl border border-border bg-background py-2 pl-11 pr-4 text-base text-primary-dark outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"/></div>
      <div id="follow-up-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-6">
        {visible.length === 0 ? <div className="rounded-2xl border border-dashed border-primary/20 bg-background px-5 py-10 text-center"><Mail aria-hidden="true" size={30} className="mx-auto text-primary/60"/><h2 className="mt-3 font-display text-2xl font-semibold text-primary-dark">{t("emptyTitle")}</h2><p className="mt-2 text-sm text-muted">{t("emptyBody")}</p></div> : <div className="grid gap-4 xl:grid-cols-2">{visible.map((candidate) => <article key={`${candidate.memberId}-${candidate.category}`} className="min-w-0 rounded-2xl border border-border bg-background p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-display text-2xl font-semibold text-primary-dark">{candidate.name}</h2><p className="mt-1 break-all text-sm text-muted">{candidate.email}</p></div><span className="rounded-full bg-mist-blue px-3 py-1.5 text-xs font-bold text-primary">{t(`status.${candidate.relatedStatus}`)}</span></div><div className="mt-5 grid gap-2 text-sm text-muted sm:grid-cols-2"><p><Clock3 aria-hidden="true" size={16} className="mr-1 inline text-primary"/>{candidate.lastReminderAt ? t("lastSent", {date: date.format(new Date(candidate.lastReminderAt))}) : t("neverSent")}</p><p>{t("previousCount", {count: candidate.reminderCount})}</p></div>{candidate.recentReminder ? <p className="mt-3 rounded-xl bg-pale-blush px-3 py-2 text-xs font-semibold leading-5 text-primary-dark">{t("recentWarning")}</p> : null}{candidate.doNotRemind ? <p className="mt-3 text-sm font-semibold text-red-800">{t("optedOut")}</p> : null}<div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4"><button type="button" disabled={candidate.doNotRemind || !publicUrlReady} onClick={() => open(candidate)} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"><Mail aria-hidden="true" size={17}/>{t("previewAction")}</button><button type="button" disabled={busyOptOut === candidate.memberId} onClick={() => void toggleOptOut(candidate)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-primary/15 bg-surface px-4 text-sm font-semibold text-primary hover:bg-mist-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><BellOff aria-hidden="true" size={16}/>{candidate.doNotRemind ? t("allowReminders") : t("doNotRemind")}</button></div></article>)}</div>}
      </div>
    </section>

    {draft ? <div className="fixed inset-0 z-50 grid place-items-center bg-primary-dark/60 p-3 backdrop-blur-sm sm:p-5"><section id="follow-up-dialog" role="dialog" aria-modal="true" aria-labelledby="follow-up-title" aria-describedby="follow-up-description" className="max-h-[95dvh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] bg-surface p-5 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary-hover">{t("previewEyebrow")}</p><h2 id="follow-up-title" className="mt-2 font-display text-3xl font-semibold text-primary-dark">{t("previewTitle")}</h2></div><button ref={closeRef} type="button" disabled={busy} onClick={() => setDraft(null)} aria-label={t("close")} className="flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/15 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X aria-hidden="true" size={20}/></button></div><p id="follow-up-description" className="mt-2 text-sm leading-6 text-muted">{t("previewDescription")}</p><div className="mt-5 rounded-xl bg-mist-blue p-4"><p className="text-xs font-bold uppercase tracking-wide text-muted">{t("recipient")}</p><p className="mt-1 break-all text-sm font-semibold text-primary-dark">{draft.candidate.name} · {draft.candidate.email}</p></div><label htmlFor="follow-up-language" className="mt-5 block text-sm font-bold text-primary-dark">{t("language")}</label><select id="follow-up-language" value={draft.language} onChange={(event) => changeLanguage(event.target.value as "en" | "es")} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><option value="en">English</option><option value="es">Español</option></select><label htmlFor="follow-up-subject" className="mt-5 block text-sm font-bold text-primary-dark">{t("subject")}</label><input id="follow-up-subject" value={draft.subject} maxLength={160} onChange={(event) => setDraft({...draft, subject: event.target.value})} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-4 text-base text-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"/><label htmlFor="follow-up-message" className="mt-5 block text-sm font-bold text-primary-dark">{t("message")}</label><textarea id="follow-up-message" value={draft.message} maxLength={2000} rows={9} onChange={(event) => setDraft({...draft, message: event.target.value})} className="mt-2 w-full rounded-xl border border-border bg-background p-4 text-base leading-7 text-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"/><p className="mt-2 text-xs leading-5 text-muted">{t("secureLinksNote")}</p><div className="mt-5 rounded-xl border border-primary/10 bg-pale-blush p-4 text-xs leading-5 text-primary-dark"><p className="font-bold">{t("noReplyNotice")}</p><p className="mt-1">{t("messageLinkNotice")}</p></div>{draft.candidate.recentReminder ? <label className="mt-5 flex min-h-11 items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-950"><input type="checkbox" checked={confirmRecent} onChange={(event) => setConfirmRecent(event.target.checked)} className="mt-1 size-5 accent-primary"/>{t("confirmRecent")}</label> : null}<label className="mt-4 flex min-h-11 items-start gap-3 text-sm leading-5 text-primary-dark"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 size-5 accent-primary"/>{t("confirmSend")}</label>{message?.error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-900">{t(`states.${message.key}`)}</p> : null}<div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={busy} onClick={() => setDraft(null)} className="min-h-12 rounded-full border border-primary/15 px-6 text-sm font-semibold text-primary hover:bg-mist-blue">{t("cancel")}</button><button type="button" disabled={busy || !confirmed || (draft.candidate.recentReminder && !confirmRecent) || draft.subject.trim().length < 3 || draft.message.trim().length < 10} onClick={() => void send()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-bold text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <LoaderCircle aria-hidden="true" size={18} className="animate-spin motion-reduce:animate-none"/> : <ArrowRight aria-hidden="true" size={18}/>} {busy ? t("sending") : t("send")}</button></div></section></div> : null}
  </>;
}
