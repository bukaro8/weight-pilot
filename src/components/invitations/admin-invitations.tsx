"use client";

import {Check, Copy, Link2, LoaderCircle, Mail, MessageCircle, MessageSquare, Plus, ShieldCheck, Trash2, UsersRound} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";
import {useEffect, useMemo, useState, type FormEvent} from "react";

import {Button} from "@/components/ui/button";
import {InvitationStatusTabs, type InvitationTabStatus} from "@/components/invitations/invitation-status-tabs";
import {invitationRegistrationLink, invitationShareMessage, smsInvitationUrl, whatsappInvitationUrl, type InvitationLanguage} from "@/features/invitations/sharing";

type AdminInvitation = {
  id: string; code: string | null; codePreview: string; createdAt: string; expiresAt: string;
  revokedAt: string | null; redeemedAt: string | null; redemptionType: "REGISTRATION" | "REACTIVATION" | null;
  creatorName: string; creatorEmail: string; creatorRole: "USER" | "ADMIN"; redeemerName: string | null; redeemerEmail: string | null;
  status: "ACTIVE" | "USED" | "EXPIRED" | "REVOKED";
};

export function AdminInvitations({initialInvitations, publicOrigin}: {initialInvitations: AdminInvitation[]; publicOrigin: string | null}) {
  const t = useTranslations("admin");
  const invitationsT = useTranslations("invitations");
  const locale = useLocale();
  const [items, setItems] = useState(initialInvitations);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const [now, setNow] = useState(0);
  const [selectedTab, setSelectedTab] = useState<InvitationTabStatus>("ACTIVE");
  const formatter = useMemo(() => new Intl.DateTimeFormat(locale, {day: "numeric", month: "short", year: "numeric"}), [locale]);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const startup = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 60_000);
    return () => { window.clearTimeout(startup); window.clearInterval(timer); };
  }, []);

  const getStatus = (item: AdminInvitation) => item.status === "ACTIVE" && now > 0 && new Date(item.expiresAt).getTime() <= now ? "EXPIRED" : item.status;
  const tabCounts = items.reduce<Record<InvitationTabStatus, number>>((counts, item) => {
    const status = getStatus(item);
    if (status !== "REVOKED") counts[status] += 1;
    return counts;
  }, {ACTIVE: 0, USED: 0, EXPIRED: 0});
  const tabItems = items.filter((item) => getStatus(item) === selectedTab);

  async function create() {
    setCreating(true); setError(undefined); setNotice(undefined);
    try {
      const response = await fetch("/api/invitations", {method: "POST"});
      if (!response.ok) {
        const body = await response.json() as {error?: string};
        throw new Error(body.error === "INVITATION_CREATE_RATE_LIMITED" ? "rate" : "create");
      }
      const body = await response.json() as {invitation: AdminInvitation};
      setItems((current) => [body.invitation, ...current]);
      setNotice(t("generated"));
    } catch (cause) { setError(cause instanceof Error && cause.message === "rate" ? invitationsT("createRateLimited") : t("generateError")); } finally { setCreating(false); }
  }

  async function revoke(id: string) {
    setRevoking(id); setError(undefined); setNotice(undefined);
    try {
      const response = await fetch(`/api/invitations/${id}`, {method: "DELETE"});
      if (!response.ok) throw new Error();
      setItems((current) => current.map((item) => item.id === id ? {...item, code: null, status: "REVOKED", revokedAt: new Date().toISOString()} : item));
      setNotice(t("revoked"));
    } catch { setError(t("revokeError")); } finally { setRevoking(undefined); }
  }

  return <main id="main-content" className="flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-10"><div className="mx-auto max-w-7xl">
    <div className="rounded-[1.5rem] bg-primary-dark p-6 text-white sm:p-9"><div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-accent"><ShieldCheck aria-hidden="true" size={24}/></div><p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-accent">{t("eyebrow")}</p><h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.025em] sm:text-5xl">{t("title")}</h1><p className="mt-4 max-w-2xl leading-7 text-white/80">{t("description")}</p><div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4"><h2 className="font-display text-xl font-semibold text-white">{invitationsT("communityTitle")}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-white/85">{invitationsT("communityBody")}</p></div><Button size="large" onClick={() => void create()} disabled={creating} className="mt-5 w-full bg-accent text-primary-dark hover:bg-white focus-visible:ring-white focus-visible:ring-offset-primary-dark sm:w-auto">{creating ? <LoaderCircle className="mr-2 motion-safe:animate-spin" aria-hidden="true" size={18}/> : <Plus className="mr-2" aria-hidden="true" size={18}/>} {creating ? t("generating") : t("generate")}</Button></div>
    <div className="mt-8"><h2 className="font-display text-3xl font-semibold text-primary-dark">{t("allInvitations")}</h2><p className="mt-1 text-sm text-muted">{t("shareIntro")}</p><InvitationStatusTabs selected={selectedTab} counts={tabCounts} ariaLabel={t("allInvitations")} onSelect={setSelectedTab} labels={{ACTIVE: invitationsT("tabs.active"), USED: invitationsT("tabs.used"), EXPIRED: invitationsT("tabs.expired")}}/></div>
    <div className="mt-4 min-h-6" aria-live="polite">{notice && <p className="flex items-center gap-2 text-sm font-semibold text-primary"><Check aria-hidden="true" size={18}/>{notice}</p>}{error && <p className="text-sm font-semibold text-red-800" role="alert">{error}</p>}{!publicOrigin && <p className="text-sm font-semibold text-red-800" role="alert">{t("publicUrlMissing")}</p>}</div>
    {tabItems.length === 0 ? <div id="invitation-status-panel" role="tabpanel" aria-labelledby={`invitation-tab-${selectedTab.toLowerCase()}`} tabIndex={0} className="mt-5 rounded-2xl border border-dashed border-primary/20 p-10 text-center text-muted"><UsersRound className="mx-auto text-primary/60" aria-hidden="true"/><p className="mt-3">{items.length === 0 ? t("empty") : invitationsT(`tabs.empty.${selectedTab.toLowerCase()}`)}</p></div> : <div id="invitation-status-panel" role="tabpanel" aria-labelledby={`invitation-tab-${selectedTab.toLowerCase()}`} tabIndex={0} className="mt-5 grid gap-4 lg:grid-cols-2">{tabItems.map((item) => {
      const status = getStatus(item);
      return <article key={item.id} className="min-w-0 rounded-2xl border border-border bg-surface p-5 shadow-[0_10px_30px_rgba(20,42,71,0.04)] sm:p-6">
        <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="font-mono text-sm font-semibold text-primary-dark">••••••{item.codePreview}</p><p className="mt-1 text-xs text-muted">{t("created", {date: formatter.format(new Date(item.createdAt))})}</p><p className="mt-1 text-xs text-muted">{invitationsT("expires", {date: formatter.format(new Date(item.expiresAt))})}</p></div><span className="shrink-0 rounded-full bg-mist-blue px-3 py-1 text-xs font-bold text-primary">{invitationsT(`status.${status.toLowerCase()}`)}</span></div>
        {status === "ACTIVE" && item.code && <InvitationSharing id={item.id} code={item.code} origin={publicOrigin} locale={locale === "es" ? "es" : "en"}/>}
        {status === "ACTIVE" && !item.code && <p className="mt-5 rounded-xl bg-background p-3 text-xs leading-5 text-muted">{t("memberCodePrivate")}</p>}
        <dl className="mt-5 grid gap-4 border-t border-border pt-5 text-sm sm:grid-cols-2"><div><dt className="font-semibold text-primary-dark">{t("createdBy")}</dt><dd className="mt-1 break-words text-muted">{item.creatorName}<br/>{item.creatorEmail}<br/><span className="text-xs font-semibold text-primary">{invitationsT(`creatorType.${item.creatorRole.toLowerCase()}`)}</span></dd></div><div><dt className="font-semibold text-primary-dark">{t("referredAccount")}</dt><dd className="mt-1 break-words text-muted">{item.redeemerName ? <>{item.redeemerName}<br/>{item.redeemerEmail}<br/><span className="text-xs">{item.redemptionType && invitationsT(`type.${item.redemptionType.toLowerCase()}`)}</span></> : t("notRedeemed")}</dd></div></dl>
        {status === "ACTIVE" && <button type="button" onClick={() => void revoke(item.id)} disabled={revoking === item.id} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-primary/15 px-4 text-sm font-semibold text-primary transition-colors motion-reduce:transition-none hover:bg-pale-blush focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">{revoking === item.id ? <LoaderCircle className="mr-2 motion-safe:animate-spin" aria-hidden="true" size={17}/> : <Trash2 className="mr-2" aria-hidden="true" size={17}/>} {t("revoke")}</button>}
      </article>;
    })}</div>}
  </div></main>;
}

export function InvitationSharing({id, code, origin, locale}: {id: string; code: string; origin: string | null; locale: InvitationLanguage}) {
  const t = useTranslations("admin");
  const invitationsT = useTranslations("invitations");
  const [language, setLanguage] = useState<InvitationLanguage>(locale);
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{kind: "success" | "error"; message: string} | null>(null);
  const link = origin ? invitationRegistrationLink(origin, language, code) : null;
  const message = link ? invitationShareMessage(language, link) : null;
  const secondaryAction = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-primary/15 bg-surface px-3 text-sm font-semibold text-primary transition-colors motion-reduce:transition-none hover:bg-mist-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50";

  async function copyLink() {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); setFeedback({kind: "success", message: t("linkCopied")}); }
    catch { setFeedback({kind: "error", message: t("copyError")}); }
  }

  async function copyCode() {
    try { await navigator.clipboard.writeText(code); setFeedback({kind: "success", message: invitationsT("codeCopied")}); }
    catch { setFeedback({kind: "error", message: t("copyError")}); }
  }

  async function sendEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!link) return;
    setSending(true); setFeedback(null);
    try {
      const response = await fetch(`/api/invitations/${id}/email`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({email, language})});
      if (!response.ok) {
        const body = await response.json() as {error?: string};
        const key = body.error === "NOT_CONFIGURED" || body.error === "PUBLIC_URL_NOT_CONFIGURED" ? "emailNotConfigured" : body.error === "INVITATION_UNAVAILABLE" ? "invitationExpired" : body.error === "INVITATION_EMAIL_RATE_LIMITED" ? "emailRateLimited" : "emailError";
        setFeedback({kind: "error", message: t(key)});
        return;
      }
      setFeedback({kind: "success", message: t("emailAccepted")});
      setEmailOpen(false); setEmail("");
    } catch { setFeedback({kind: "error", message: t("emailError")}); }
    finally { setSending(false); }
  }

  return <div className="mt-5 rounded-2xl border border-primary/10 bg-background p-4">
    <fieldset><legend className="text-xs font-bold uppercase tracking-[0.12em] text-primary-dark">{t("shareLanguage")}</legend><div className="mt-2 inline-flex rounded-full border border-primary/15 bg-surface p-1">{(["en", "es"] as const).map((value) => <button key={value} type="button" aria-pressed={language === value} onClick={() => {setLanguage(value); setFeedback(null);}} className={`min-h-11 min-w-14 rounded-full px-3 text-sm font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${language === value ? "bg-primary text-white" : "text-primary hover:bg-mist-blue"}`}>{value.toUpperCase()}</button>)}</div></fieldset>
    <div className="mt-4 grid gap-2 min-[480px]:grid-cols-2">
      <button type="button" disabled={!link} onClick={() => setEmailOpen((current) => !current)} aria-expanded={emailOpen} aria-controls={`invitation-email-${id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-3 text-sm font-semibold text-white transition-colors motion-reduce:transition-none hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"><Mail aria-hidden="true" size={17}/>{t("emailAction")}</button>
      {message ? <a href={whatsappInvitationUrl(message)} target="_blank" rel="noopener noreferrer" className={secondaryAction}><MessageCircle aria-hidden="true" size={17}/>{t("whatsappAction")}</a> : <button type="button" disabled className={secondaryAction}><MessageCircle aria-hidden="true" size={17}/>{t("whatsappAction")}</button>}
      {message ? <a href={smsInvitationUrl(message)} className={secondaryAction}><MessageSquare aria-hidden="true" size={17}/>{t("smsAction")}</a> : <button type="button" disabled className={secondaryAction}><MessageSquare aria-hidden="true" size={17}/>{t("smsAction")}</button>}
      <button type="button" disabled={!link} onClick={() => void copyLink()} className={secondaryAction}><Link2 aria-hidden="true" size={17}/>{t("copyLinkAction")}</button>
      <button type="button" onClick={() => void copyCode()} className={secondaryAction}><Copy aria-hidden="true" size={17}/>{invitationsT("copyCode")}</button>
    </div>
    {emailOpen && <form id={`invitation-email-${id}`} onSubmit={(event) => void sendEmail(event)} className="mt-4 border-t border-border pt-4"><label htmlFor={`invitation-recipient-${id}`} className="block text-sm font-semibold text-primary-dark">{t("recipientEmail")}</label><div className="mt-2 flex flex-col gap-2 sm:flex-row"><input id={`invitation-recipient-${id}`} type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("recipientPlaceholder")} className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-sm text-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"/><Button type="submit" disabled={sending} className="w-full sm:w-auto">{sending ? <LoaderCircle className="mr-2 motion-safe:animate-spin" aria-hidden="true" size={17}/> : <Mail className="mr-2" aria-hidden="true" size={17}/>} {sending ? t("sending") : t("sendEmail")}</Button></div><p className="mt-2 text-xs leading-5 text-muted">{t("emailHelp")}</p></form>}
    {feedback && <p className={`mt-3 flex items-start gap-2 text-sm font-semibold ${feedback.kind === "error" ? "text-red-800" : "text-primary"}`} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.kind === "success" && <Check aria-hidden="true" size={18}/>}<span>{feedback.message}</span></p>}
  </div>;
}
