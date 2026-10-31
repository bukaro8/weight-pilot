"use client";

import {ArrowLeft, CheckCircle2, LoaderCircle, ShieldCheck, Trash2, UserCheck, UserRoundX} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";
import {useEffect, useMemo, useRef, useState} from "react";

import {buttonVariants} from "@/components/ui/button";
import type {AdminUserDetail} from "@/features/admin/types";
import {Link} from "@/i18n/navigation";
import {cn} from "@/lib/utils";

export function AdminUserDetailView({initialUser}: {initialUser: AdminUserDetail}) {
  const t = useTranslations("adminUserDetail");
  const invitationsT = useTranslations("invitations");
  const ti = useTranslations("adminUserInvitations");
  const locale = useLocale();
  const [member, setMember] = useState(initialUser);
  const [busy, setBusy] = useState<"status" | "delete">();
  const [message, setMessage] = useState<"statusSuccess" | "statusError" | "deleteError">();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleted, setDeleted] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const formatter = useMemo(() => new Intl.DateTimeFormat(locale, {dateStyle: "long", timeZone: "Europe/London"}), [locale]);

  useEffect(() => {
    if (!confirmingDelete) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) { setConfirmingDelete(false); setConfirmation(""); }
      if (event.key !== "Tab") return;
      const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [href]') ?? [])];
      const first = controls.at(0); const last = controls.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [busy, confirmingDelete]);

  async function updateStatus() {
    const status = member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setBusy("status"); setMessage(undefined);
    try {
      const response = await fetch(`/api/admin/users/${member.id}`, {method: "PATCH", headers: {"content-type": "application/json"}, body: JSON.stringify({status})});
      if (!response.ok) throw new Error();
      setMember((current) => ({...current, status, activeSessionCount: status === "INACTIVE" ? 0 : current.activeSessionCount}));
      setMessage("statusSuccess");
    } catch { setMessage("statusError"); } finally { setBusy(undefined); }
  }

  async function deleteUser() {
    if (confirmation !== "DELETE") return;
    setBusy("delete"); setMessage(undefined);
    try {
      const response = await fetch(`/api/admin/users/${member.id}`, {method: "DELETE", headers: {"content-type": "application/json"}, body: JSON.stringify({confirmation})});
      if (!response.ok) throw new Error();
      setDeleted(true); setConfirmingDelete(false);
    } catch { setMessage("deleteError"); setConfirmingDelete(false); } finally { setBusy(undefined); }
  }

  if (deleted) return <main id="main-content" className="px-4 py-10 sm:px-6 lg:px-10"><div className="mx-auto max-w-xl rounded-[1.5rem] border border-emerald-200 bg-surface p-6 text-center shadow-[0_16px_40px_rgba(20,42,71,0.06)] sm:p-9"><CheckCircle2 className="mx-auto text-emerald-700" aria-hidden="true" size={38}/><h1 className="mt-5 font-display text-3xl font-semibold text-primary-dark">{t("deletedTitle")}</h1><p className="mt-3 leading-7 text-muted">{t("deletedBody")}</p><Link href="/admin/users" className={`${buttonVariants({size: "large"})} mt-7 w-full sm:w-auto`}>{t("returnToUsers")}</Link></div></main>;

  const nextAction = member.status === "ACTIVE" ? "deactivate" : "activate";
  return <main id="main-content" className="px-4 py-7 sm:px-6 sm:py-10 xl:px-10"><div className="mx-auto max-w-6xl">
    <Link href="/admin/users" className={`${buttonVariants({variant: "ghost"})} -ml-3`}><ArrowLeft className="mr-2" aria-hidden="true" size={17}/>{t("back")}</Link>
    <header className="mt-4 rounded-[1.5rem] bg-primary-dark p-6 text-white shadow-[0_18px_45px_rgba(20,42,71,0.12)] sm:p-9"><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{t("eyebrow")}</p><div className="mt-3 flex flex-wrap items-center gap-3"><h1 className="font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">{member.name}</h1><StatusPill active={member.status === "ACTIVE"}>{t(member.status === "ACTIVE" ? "active" : "inactive")}</StatusPill></div><p className="mt-3 break-all text-sm text-white/70">{member.email}</p><p className="mt-4 max-w-2xl leading-7 text-white/75">{t("description")}</p></header>

    {message ? <p role={message.endsWith("Error") ? "alert" : "status"} className={cn("mt-6 rounded-xl border px-4 py-3 text-sm font-semibold", message.endsWith("Error") ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900")}>{t(message)}</p> : null}

    <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
      <section aria-labelledby="account-details" className="rounded-[1.5rem] border border-primary/10 bg-surface p-5 shadow-[0_10px_30px_rgba(20,42,71,0.04)] sm:p-7"><h2 id="account-details" className="font-display text-3xl font-semibold text-primary-dark">{t("detailsTitle")}</h2><dl className="mt-6 grid gap-5 sm:grid-cols-2"><Detail label={t("name")} value={member.name}/><Detail label={t("email")} value={member.email} breakAll/><Detail label={t("registered")} value={formatter.format(new Date(member.createdAt))}/><Detail label={t("language")} value={member.preferredLanguage.toUpperCase()}/><Detail label={t("verification")} value={t(member.emailVerified ? "verified" : "unverified")}/><Detail label={t("status")} value={t(member.status === "ACTIVE" ? "active" : "inactive")}/><Detail label={t("referral")} value={member.referralSource ? `${member.referralSource.name} · ${member.referralSource.email}` : t("direct")} breakAll/></dl></section>

      <section aria-labelledby="account-access" className="rounded-[1.5rem] border border-primary/10 bg-mist-blue/45 p-5 sm:p-7"><div className="flex size-11 items-center justify-center rounded-xl bg-surface text-primary shadow-sm"><ShieldCheck aria-hidden="true" size={21}/></div><h2 id="account-access" className="mt-5 font-display text-3xl font-semibold text-primary-dark">{t("statusTitle")}</h2><p className="mt-3 text-sm leading-6 text-muted">{t("statusBody")}</p><button type="button" disabled={Boolean(busy)} onClick={() => void updateStatus()} className={`${buttonVariants({variant: member.status === "ACTIVE" ? "secondary" : "primary", size: "large"})} mt-6 w-full`}>{busy === "status" ? <LoaderCircle className="mr-2 animate-spin motion-reduce:animate-none" aria-hidden="true" size={18}/> : member.status === "ACTIVE" ? <UserRoundX className="mr-2" aria-hidden="true" size={18}/> : <UserCheck className="mr-2" aria-hidden="true" size={18}/>} {t(busy === "status" ? "updating" : nextAction)}</button></section>
    </div>

    <div className="mt-6 grid gap-6 lg:grid-cols-2"><section aria-labelledby="activity-title" className="rounded-[1.5rem] border border-primary/10 bg-surface p-5 sm:p-7"><h2 id="activity-title" className="font-display text-2xl font-semibold text-primary-dark">{t("activityTitle")}</h2><dl className="mt-5 grid grid-cols-3 gap-3"><Metric value={member.activeSessionCount} label={t("sessions")}/><Metric value={member.questionnaireCount} label={t("questionnaires")}/><Metric value={member.invitationCount} label={t("invitations")}/></dl></section><section aria-labelledby="reviews-title" className="rounded-[1.5rem] border border-primary/10 bg-surface p-5 sm:p-7"><h2 id="reviews-title" className="font-display text-2xl font-semibold text-primary-dark">{t("reviewsTitle")}</h2>{member.reviewRequests.length ? <div className="mt-4 grid gap-2">{member.reviewRequests.map((review) => <Link key={review.id} href={`/admin/questionnaires/${review.id}`} className={`${buttonVariants({variant: "secondary"})} justify-between`}>{t("openReview", {status: t(`reviewStatus.${review.status}`)})}</Link>)}</div> : <p className="mt-4 text-sm text-muted">{t("noReviews")}</p>}</section></div>

    <section aria-labelledby="created-invitations-title" className="mt-6 rounded-[1.5rem] border border-primary/10 bg-surface p-5 shadow-[0_10px_30px_rgba(20,42,71,0.04)] sm:p-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 id="created-invitations-title" className="font-display text-2xl font-semibold text-primary-dark">{ti("title")}</h2><p className="mt-1 text-sm text-muted">{ti("description")}</p></div><dl className="grid grid-cols-2 gap-2"><Metric value={member.invitationCount} label={ti("createdCount")}/><Metric value={member.usedInvitationCount} label={ti("usedCount")}/></dl></div>{member.createdInvitations.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-primary/20 p-6 text-center text-sm text-muted">{ti("empty")}</p> : <div className="mt-5 grid gap-3 md:grid-cols-2">{member.createdInvitations.map((item) => <article key={item.id} className="min-w-0 rounded-xl border border-border bg-background p-4"><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-mist-blue px-3 py-1 text-xs font-bold text-primary">{invitationsT(`status.${item.status.toLowerCase()}`)}</span><span className="text-right text-xs text-muted">{invitationsT("created", {date: formatter.format(new Date(item.createdAt))})}</span></div><p className="mt-2 text-xs text-muted">{item.expiresAt ? invitationsT("expires", {date: formatter.format(new Date(item.expiresAt))}) : invitationsT("neverExpires")}</p>{item.redeemer && <div className="mt-3 border-t border-border pt-3"><p className="text-xs font-semibold text-primary-dark">{ti("redeemedBy")}</p><p className="mt-1 break-words text-sm text-muted">{item.redeemer.name}<br/>{item.redeemer.email}</p></div>}</article>)}</div>}</section>

    <section aria-labelledby="danger-title" className="mt-6 rounded-[1.5rem] border border-red-200 bg-red-50/60 p-5 sm:p-7"><p className="text-xs font-bold uppercase tracking-[0.16em] text-red-800">{t("dangerEyebrow")}</p><div className="mt-2 grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div><h2 id="danger-title" className="font-display text-2xl font-semibold text-red-950">{t("dangerTitle")}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-red-900/80">{t("dangerBody")}</p></div><button type="button" disabled={Boolean(busy)} onClick={() => {setConfirmation(""); setConfirmingDelete(true);}} className="inline-flex min-h-11 items-center justify-center rounded-full bg-red-800 px-5 text-sm font-bold text-white transition-colors hover:bg-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-800 focus-visible:ring-offset-2"><Trash2 className="mr-2" aria-hidden="true" size={17}/>{t("delete")}</button></div></section>
  </div>

  {confirmingDelete ? <div className="fixed inset-0 z-50 grid place-items-center bg-primary-dark/55 p-4 backdrop-blur-sm" role="presentation"><section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description" className="w-full max-w-lg rounded-[1.5rem] bg-surface p-6 shadow-2xl sm:p-8"><div className="flex size-12 items-center justify-center rounded-2xl bg-red-100 text-red-800"><Trash2 aria-hidden="true" size={23}/></div><h2 id="delete-dialog-title" className="mt-5 font-display text-3xl font-semibold text-primary-dark">{t("confirmTitle")}</h2><p id="delete-dialog-description" className="mt-3 text-sm leading-6 text-muted">{t("confirmBody")}</p><label htmlFor="delete-confirmation" className="mt-6 block text-sm font-semibold text-primary-dark">{t("confirmationLabel")}</label><input id="delete-confirmation" autoFocus autoComplete="off" spellCheck={false} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={t("confirmationPlaceholder")} className="mt-2 min-h-11 w-full rounded-xl border border-red-200 bg-background px-3.5 font-mono text-sm font-bold tracking-[0.12em] text-primary-dark outline-none focus:border-red-700 focus:ring-2 focus:ring-red-700/15"/><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={Boolean(busy)} onClick={() => {setConfirmingDelete(false); setConfirmation("");}} className={buttonVariants({variant: "secondary"})}>{t("cancel")}</button><button type="button" disabled={confirmation !== "DELETE" || Boolean(busy)} onClick={() => void deleteUser()} className="inline-flex min-h-11 items-center justify-center rounded-full bg-red-800 px-5 text-sm font-bold text-white hover:bg-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-800 disabled:pointer-events-none disabled:opacity-45">{busy === "delete" && <LoaderCircle className="mr-2 animate-spin motion-reduce:animate-none" aria-hidden="true" size={17}/>} {t(busy === "delete" ? "deleting" : "confirmDelete")}</button></div></section></div> : null}
  </main>;
}

function StatusPill({active, children}: {active: boolean; children: React.ReactNode}) { return <span className={cn("rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide", active ? "bg-emerald-100 text-emerald-900" : "bg-white/10 text-white")}>{children}</span>; }
function Detail({label, value, breakAll}: {label: string; value: string; breakAll?: boolean}) { return <div><dt className="text-xs font-bold uppercase tracking-[0.1em] text-muted">{label}</dt><dd className={cn("mt-1.5 text-sm font-semibold text-primary-dark", breakAll && "break-all")}>{value}</dd></div>; }
function Metric({value, label}: {value: number; label: string}) { return <div className="min-w-0 rounded-xl bg-mist-blue/55 p-3 text-center"><dd className="font-display text-3xl font-semibold text-primary-dark">{value}</dd><dt className="mt-1 text-xs font-semibold leading-4 text-muted">{label}</dt></div>; }
