"use client";

import {Check, Clipboard, Link2, LoaderCircle, Plus, Ticket, Trash2} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";
import {useMemo, useState} from "react";

import {Button} from "@/components/ui/button";

type InvitationItem = {
  id: string; code: string | null; codePreview: string; createdAt: string; expiresAt: string;
  redeemedAt: string | null; revokedAt: string | null; redemptionType: "REGISTRATION" | "REACTIVATION" | null;
  status: "ACTIVE" | "USED" | "EXPIRED" | "REVOKED";
};

export function MemberInvitations({initialInvitations}: {initialInvitations: InvitationItem[]}) {
  const t = useTranslations("invitations");
  const locale = useLocale();
  const [items, setItems] = useState(initialInvitations);
  const [pending, setPending] = useState(false);
  const [revoking, setRevoking] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const formatter = useMemo(() => new Intl.DateTimeFormat(locale, {day: "numeric", month: "short", year: "numeric"}), [locale]);
  const active = items.filter((item) => item.status === "ACTIVE");
  const history = items.filter((item) => item.status !== "ACTIVE");

  async function generate() {
    setPending(true); setError(undefined); setNotice(undefined);
    try {
      const response = await fetch("/api/invitations", {method: "POST"});
      if (!response.ok) throw new Error();
      const body = await response.json() as {invitation: InvitationItem};
      setItems((current) => [body.invitation, ...current]);
      setNotice(t("generated"));
    } catch { setError(t("generateError")); } finally { setPending(false); }
  }

  async function copy(value: string, message: string) {
    try { await navigator.clipboard.writeText(value); setError(undefined); setNotice(message); }
    catch { setNotice(undefined); setError(t("copyError")); }
  }

  async function revoke(id: string) {
    setRevoking(id); setError(undefined); setNotice(undefined);
    try {
      const response = await fetch(`/api/invitations/${id}`, {method: "DELETE"});
      if (!response.ok) throw new Error();
      setItems((current) => current.map((item) => item.id === id ? {...item, status: "REVOKED", revokedAt: new Date().toISOString()} : item));
      setNotice(t("revoked"));
    } catch { setError(t("revokeError")); } finally { setRevoking(undefined); }
  }

  const statusLabel = (status: InvitationItem["status"]) => t(`status.${status.toLowerCase()}`);
  const invitationLink = (code: string) => `${window.location.origin}/${locale}/register?code=${encodeURIComponent(code)}`;

  return (
    <main id="main-content" className="flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-end gap-7 border-b border-border pb-8 md:grid-cols-[1fr_auto]">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-hover">{t("eyebrow")}</p><h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-tight tracking-[-0.025em] text-primary-dark sm:text-5xl">{t("title")}</h1><p className="mt-4 max-w-2xl leading-7 text-muted">{t("description")}</p></div>
          <Button size="large" onClick={generate} disabled={pending} className="w-full md:w-auto">{pending ? <LoaderCircle className="mr-2 animate-spin" aria-hidden="true" size={19}/> : <Plus className="mr-2" aria-hidden="true" size={19}/>} {pending ? t("generating") : t("generate")}</Button>
        </div>
        <div className="mt-6 min-h-6" aria-live="polite">{notice && <p className="flex items-center gap-2 text-sm font-semibold text-primary"><Check aria-hidden="true" size={18}/>{notice}</p>}{error && <p className="text-sm font-semibold text-red-800" role="alert">{error}</p>}</div>

        <section className="mt-5" aria-labelledby="active-invitations">
          <div className="flex items-baseline justify-between gap-4"><h2 id="active-invitations" className="font-display text-3xl font-semibold text-primary-dark">{t("activeTitle")}</h2><span className="text-sm text-muted">{active.length}</span></div>
          {active.length === 0 ? <EmptyState title={t("emptyTitle")} body={t("emptyBody")}/> : <div className="mt-5 grid gap-4 lg:grid-cols-2">{active.map((item) => <article key={item.id} className="rounded-2xl border border-primary/10 bg-surface p-5 shadow-[0_12px_35px_rgba(20,42,71,0.06)] sm:p-6">
            <div className="flex items-start justify-between gap-3"><div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-pale-blush text-primary"><Ticket aria-hidden="true" size={21}/></div><span className="rounded-full bg-mist-blue px-3 py-1 text-xs font-bold text-primary">{statusLabel(item.status)}</span></div>
            <p className="mt-5 break-all font-mono text-xs font-semibold tracking-tight text-primary-dark min-[420px]:text-sm">{item.code ?? `••••••${item.codePreview}`}</p>
            <p className="mt-2 text-xs leading-5 text-muted">{t("expires", {date: formatter.format(new Date(item.expiresAt))})}</p>
            <div className="mt-5 grid gap-2 min-[420px]:grid-cols-2">
              <Button variant="secondary" onClick={() => item.code && copy(item.code, t("codeCopied"))} disabled={!item.code}><Clipboard className="mr-2" aria-hidden="true" size={17}/>{t("copyCode")}</Button>
              <Button variant="secondary" onClick={() => item.code && copy(invitationLink(item.code), t("linkCopied"))} disabled={!item.code}><Link2 className="mr-2" aria-hidden="true" size={17}/>{t("copyLink")}</Button>
            </div>
            <button type="button" onClick={() => revoke(item.id)} disabled={revoking === item.id} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full px-4 text-sm font-semibold text-muted transition-colors hover:bg-pale-blush hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">{revoking === item.id ? <LoaderCircle className="mr-2 animate-spin" aria-hidden="true" size={17}/> : <Trash2 className="mr-2" aria-hidden="true" size={17}/>} {t("revoke")}</button>
          </article>)}</div>}
        </section>

        <section className="mt-12" aria-labelledby="invitation-history"><h2 id="invitation-history" className="font-display text-3xl font-semibold text-primary-dark">{t("historyTitle")}</h2>{history.length === 0 ? <p className="mt-4 text-sm text-muted">{t("historyEmpty")}</p> : <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-surface">{history.map((item, index) => <div key={item.id} className={`grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5 ${index ? "border-t border-border" : ""}`}><div><p className="font-mono text-sm font-semibold text-primary-dark">••••••{item.codePreview}</p><p className="mt-1 text-xs text-muted">{t("created", {date: formatter.format(new Date(item.createdAt))})}{item.redemptionType ? ` · ${t(`type.${item.redemptionType.toLowerCase()}`)}` : ""}</p></div><span className="w-fit rounded-full bg-background px-3 py-1 text-xs font-bold text-muted">{statusLabel(item.status)}</span></div>)}</div>}</section>
      </div>
    </main>
  );
}

function EmptyState({title, body}: {title: string; body: string}) {
  return <div className="mt-5 rounded-2xl border border-dashed border-primary/20 bg-mist-blue/35 px-5 py-10 text-center"><Ticket className="mx-auto text-primary/65" aria-hidden="true" size={30}/><h3 className="mt-4 font-display text-2xl font-semibold text-primary-dark">{title}</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">{body}</p></div>;
}
