"use client";

import {LoaderCircle, ShieldCheck, Trash2, UsersRound} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";
import {useMemo, useState} from "react";

type AdminInvitation = {id: string; codePreview: string; createdAt: string; expiresAt: string; revokedAt: string | null; redeemedAt: string | null; redemptionType: "REGISTRATION" | "REACTIVATION" | null; creatorName: string; creatorEmail: string; redeemerName: string | null; redeemerEmail: string | null; status: "ACTIVE" | "USED" | "EXPIRED" | "REVOKED"};

export function AdminInvitations({initialInvitations}: {initialInvitations: AdminInvitation[]}) {
  const t = useTranslations("admin");
  const invitationsT = useTranslations("invitations");
  const locale = useLocale();
  const [items, setItems] = useState(initialInvitations);
  const [pending, setPending] = useState<string>();
  const [error, setError] = useState<string>();
  const formatter = useMemo(() => new Intl.DateTimeFormat(locale, {day: "numeric", month: "short", year: "numeric"}), [locale]);
  async function revoke(id: string) {
    setPending(id); setError(undefined);
    try {
      const response = await fetch(`/api/invitations/${id}`, {method: "DELETE"});
      if (!response.ok) throw new Error();
      setItems((current) => current.map((item) => item.id === id ? {...item, status: "REVOKED", revokedAt: new Date().toISOString()} : item));
    } catch { setError(t("revokeError")); } finally { setPending(undefined); }
  }
  return <main id="main-content" className="flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-10"><div className="mx-auto max-w-7xl">
    <div className="rounded-[1.5rem] bg-primary-dark p-6 text-white sm:p-9"><div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-accent"><ShieldCheck aria-hidden="true" size={24}/></div><p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-accent">{t("eyebrow")}</p><h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.025em] sm:text-5xl">{t("title")}</h1><p className="mt-4 max-w-2xl leading-7 text-white/75">{t("description")}</p></div>
    <div className="mt-8 flex items-center justify-between gap-4"><h2 className="font-display text-3xl font-semibold text-primary-dark">{t("allInvitations")}</h2><span className="rounded-full bg-mist-blue px-3 py-1 text-sm font-bold text-primary">{items.length}</span></div>
    {error && <p className="mt-5 text-sm font-semibold text-red-800" role="alert">{error}</p>}
    {items.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-primary/20 p-10 text-center text-muted"><UsersRound className="mx-auto text-primary/60" aria-hidden="true"/><p className="mt-3">{t("empty")}</p></div> : <div className="mt-5 grid gap-4 lg:grid-cols-2">{items.map((item) => <article key={item.id} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><p className="font-mono text-sm font-semibold text-primary-dark">••••••{item.codePreview}</p><p className="mt-1 text-xs text-muted">{t("created", {date: formatter.format(new Date(item.createdAt))})}</p></div><span className="shrink-0 rounded-full bg-mist-blue px-3 py-1 text-xs font-bold text-primary">{invitationsT(`status.${item.status.toLowerCase()}`)}</span></div>
      <dl className="mt-5 grid gap-4 border-t border-border pt-5 text-sm sm:grid-cols-2"><div><dt className="font-semibold text-primary-dark">{t("createdBy")}</dt><dd className="mt-1 break-words text-muted">{item.creatorName}<br/>{item.creatorEmail}</dd></div><div><dt className="font-semibold text-primary-dark">{t("referredAccount")}</dt><dd className="mt-1 break-words text-muted">{item.redeemerName ? <>{item.redeemerName}<br/>{item.redeemerEmail}<br/><span className="text-xs">{item.redemptionType && invitationsT(`type.${item.redemptionType.toLowerCase()}`)}</span></> : t("notRedeemed")}</dd></div></dl>
      {item.status === "ACTIVE" && <button type="button" onClick={() => revoke(item.id)} disabled={pending === item.id} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-primary/15 px-4 text-sm font-semibold text-primary transition-colors hover:bg-pale-blush focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">{pending === item.id ? <LoaderCircle className="mr-2 animate-spin" aria-hidden="true" size={17}/> : <Trash2 className="mr-2" aria-hidden="true" size={17}/>} {t("revoke")}</button>}
    </article>)}</div>}
  </div></main>;
}
