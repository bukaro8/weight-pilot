"use client";

import {Check, LoaderCircle, Plus, Ticket, Trash2} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";
import {useEffect, useMemo, useState} from "react";

import {Button} from "@/components/ui/button";
import {InvitationSharing} from "@/components/invitations/admin-invitations";
import {InvitationStatusTabs, type InvitationTabStatus} from "@/components/invitations/invitation-status-tabs";
import type {InvitationLanguage} from "@/features/invitations/sharing";

type InvitationItem = {
  id: string; code: string | null; codePreview: string; createdAt: string; expiresAt: string;
  redeemedAt: string | null; revokedAt: string | null;
  redemptionType: "REGISTRATION" | "REACTIVATION" | null;
  status: "ACTIVE" | "USED" | "EXPIRED" | "REVOKED";
};

export function MemberInvitations({initialInvitations, publicOrigin}: {initialInvitations: InvitationItem[]; publicOrigin: string | null}) {
  const t = useTranslations("invitations");
  const ta = useTranslations("admin");
  const locale = useLocale();
  const [items, setItems] = useState(initialInvitations);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const [selectedTab, setSelectedTab] = useState<InvitationTabStatus>("ACTIVE");
  const [now, setNow] = useState(0);
  const formatter = useMemo(() => new Intl.DateTimeFormat(locale, {day: "numeric", month: "short", year: "numeric"}), [locale]);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const startup = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 60_000);
    return () => { window.clearTimeout(startup); window.clearInterval(timer); };
  }, []);

  async function create() {
    setCreating(true); setError(undefined); setNotice(undefined);
    try {
      const response = await fetch("/api/invitations", {method: "POST"});
      if (!response.ok) {
        const body = await response.json() as {error?: string};
        throw new Error(body.error === "INVITATION_CREATE_RATE_LIMITED" ? "rate" : "create");
      }
      const body = await response.json() as {invitation: InvitationItem};
      setItems((current) => [body.invitation, ...current]);
      setNotice(t("generated"));
    } catch (cause) { setError(cause instanceof Error && cause.message === "rate" ? t("createRateLimited") : t("generateError")); }
    finally { setCreating(false); }
  }

  async function revoke(id: string) {
    setRevoking(id); setError(undefined); setNotice(undefined);
    try {
      const response = await fetch(`/api/invitations/${id}`, {method: "DELETE"});
      if (!response.ok) throw new Error();
      setItems((current) => current.map((item) => item.id === id ? {...item, code: null, status: "REVOKED", revokedAt: new Date().toISOString()} : item));
      setNotice(t("revoked"));
    } catch { setError(t("revokeError")); }
    finally { setRevoking(undefined); }
  }

  const getStatus = (item: InvitationItem) => item.status === "ACTIVE" && now > 0 && new Date(item.expiresAt).getTime() <= now ? "EXPIRED" : item.status;
  const tabCounts = items.reduce<Record<InvitationTabStatus, number>>((counts, item) => {
    const status = getStatus(item);
    if (status !== "REVOKED") counts[status] += 1;
    return counts;
  }, {ACTIVE: 0, USED: 0, EXPIRED: 0});
  const tabItems = items.filter((item) => getStatus(item) === selectedTab);

  return <main id="main-content" className="flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-10"><div className="mx-auto max-w-5xl">
    <div className="rounded-[1.75rem] bg-primary-dark p-6 text-white sm:p-9"><div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-accent"><Ticket aria-hidden="true" size={24}/></div><p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-accent">{t("memberHistoryEyebrow")}</p><h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">{t("memberHistoryTitle")}</h1><p className="mt-4 max-w-2xl leading-7 text-white/80">{t("memberHistoryDescription")}</p><div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4"><h2 className="font-display text-xl font-semibold">{t("communityTitle")}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-white/85">{t("communityBody")}</p></div><Button size="large" onClick={() => void create()} disabled={creating} className="mt-5 w-full bg-accent text-primary-dark hover:bg-white focus-visible:ring-white focus-visible:ring-offset-primary-dark sm:w-auto">{creating ? <LoaderCircle className="mr-2 motion-safe:animate-spin" aria-hidden="true" size={18}/> : <Plus className="mr-2" aria-hidden="true" size={18}/>} {creating ? t("generating") : t("generate")}</Button></div>
    <div className="mt-4 min-h-6" aria-live="polite">{notice && <p className="flex items-center gap-2 text-sm font-semibold text-primary"><Check aria-hidden="true" size={18}/>{notice}</p>}{error && <p className="text-sm font-semibold text-red-800" role="alert">{error}</p>}{!publicOrigin && <p className="text-sm font-semibold text-red-800" role="alert">{ta("publicUrlMissing")}</p>}</div>
    <section aria-labelledby="invitation-list-title" className="mt-6"><h2 id="invitation-list-title" className="font-display text-3xl font-semibold text-primary-dark">{t("historyTitle")}</h2><InvitationStatusTabs selected={selectedTab} counts={tabCounts} ariaLabel={t("historyTitle")} onSelect={setSelectedTab} labels={{ACTIVE: t("tabs.active"), USED: t("tabs.used"), EXPIRED: t("tabs.expired")}}/>
      {tabItems.length === 0 ? <p id="invitation-status-panel" role="tabpanel" aria-labelledby={`invitation-tab-${selectedTab.toLowerCase()}`} tabIndex={0} className="mt-4 rounded-2xl border border-dashed border-primary/20 bg-surface px-5 py-8 text-center text-muted">{items.length === 0 && selectedTab === "ACTIVE" ? t("emptyBody") : t(`tabs.empty.${selectedTab.toLowerCase()}`)}</p> : <div id="invitation-status-panel" role="tabpanel" aria-labelledby={`invitation-tab-${selectedTab.toLowerCase()}`} tabIndex={0} className="mt-4 grid gap-4 lg:grid-cols-2">{tabItems.map((item) => <article key={item.id} className="min-w-0 rounded-2xl border border-border bg-surface p-5 shadow-[0_10px_30px_rgba(20,42,71,0.04)] sm:p-6"><div className="flex items-start justify-between gap-3"><p className="font-mono text-sm font-semibold text-primary-dark">••••••{item.codePreview}</p><span className="shrink-0 rounded-full bg-mist-blue px-3 py-1 text-xs font-bold text-primary">{t(`status.${getStatus(item).toLowerCase()}`)}</span></div><p className="mt-3 text-xs text-muted">{t("created", {date: formatter.format(new Date(item.createdAt))})}</p><p className="mt-1 text-xs text-muted">{t("expires", {date: formatter.format(new Date(item.expiresAt))})}</p>{selectedTab === "ACTIVE" && item.code && <InvitationSharing id={item.id} code={item.code} origin={publicOrigin} locale={locale === "es" ? "es" : "en" as InvitationLanguage} />}{selectedTab === "ACTIVE" && <button type="button" onClick={() => void revoke(item.id)} disabled={revoking === item.id} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-primary/15 px-4 text-sm font-semibold text-primary transition-colors motion-reduce:transition-none hover:bg-pale-blush focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">{revoking === item.id ? <LoaderCircle className="mr-2 motion-safe:animate-spin" aria-hidden="true" size={17}/> : <Trash2 className="mr-2" aria-hidden="true" size={17}/>} {ta("revoke")}</button>}</article>)}</div>}
    </section>
  </div></main>;
}
