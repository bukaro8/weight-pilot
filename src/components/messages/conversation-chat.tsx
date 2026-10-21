"use client";

import {FormEvent, useCallback, useEffect, useRef, useState} from "react";
import {ArrowUp, Check, LoaderCircle, MessageCircle, RefreshCw} from "lucide-react";
import {useTranslations} from "next-intl";
import type {Locale} from "@/i18n/routing";
import type {MessageItem} from "@/features/messages/types";

type Props = {
  locale: Locale;
  apiPath: string;
  readPath: string;
  initialMessages: MessageItem[];
  initialUnreadCount: number;
  title: string;
  description: string;
  recipient?: string;
  accountStatus?: "ACTIVE" | "INACTIVE";
};

export function ConversationChat({locale, apiPath, readPath, initialMessages, initialUnreadCount, title, description, recipient, accountStatus}: Props) {
  const t = useTranslations("messages");
  const [messages, setMessages] = useState(initialMessages);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingRequestRef = useRef<{body: string; id: string} | null>(null);
  const date = useCallback((value: string) => new Intl.DateTimeFormat(locale, {dateStyle: "medium", timeStyle: "short"}).format(new Date(value)), [locale]);

  const markRead = useCallback(async () => {
    try {
      const response = await fetch(readPath, {method: "POST", headers: {"content-type": "application/json"}, body: "{}", cache: "no-store"});
      if (response.ok) setUnreadCount(0);
    } catch { /* Polling can retry when the connection returns. */ }
  }, [readPath]);

  const refresh = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch(apiPath, {cache: "no-store"});
      if (!response.ok) throw new Error("LOAD_FAILED");
      const result = await response.json() as {messages?: MessageItem[]; conversation?: {messages: MessageItem[]; unreadCount: number}; unreadCount?: number};
      const updated = result.messages ?? result.conversation?.messages ?? [];
      setMessages(updated);
      setUnreadCount(result.unreadCount ?? result.conversation?.unreadCount ?? 0);
      setError(null);
      await markRead();
    } catch { setError("load"); }
    finally { if (showLoading) setLoading(false); }
  }, [apiPath, markRead]);

  useEffect(() => {
    void fetch(readPath, {method: "POST", headers: {"content-type": "application/json"}, body: "{}", cache: "no-store"}).catch(() => undefined);
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [readPath, refresh]);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior: "smooth", block: "end"}); }, [messages.length]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending || accountStatus === "INACTIVE") return;
    if (!pendingRequestRef.current || pendingRequestRef.current.body !== body) pendingRequestRef.current = {body, id: crypto.randomUUID()};
    setSending(true);
    setError(null);
    try {
      const response = await fetch(apiPath, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({body, clientMessageId: pendingRequestRef.current.id})});
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as {error?: string};
        setError(payload.error === "MESSAGE_RATE_LIMITED" ? "rateLimited" : "send");
        return;
      }
      const payload = await response.json() as {message: MessageItem};
      setMessages((current) => current.some((message) => message.id === payload.message.id) ? current : [...current, payload.message]);
      setDraft("");
      pendingRequestRef.current = null;
    } catch { setError("send"); }
    finally { setSending(false); }
  }

  const disabled = sending || !draft.trim() || accountStatus === "INACTIVE";
  return <main id="main-content" className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
    <section className="flex min-h-[min(76dvh,760px)] flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-primary/10 bg-surface shadow-[0_18px_48px_rgba(20,42,71,0.07)]">
      <header className="border-b border-border bg-mist-blue/40 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white"><MessageCircle aria-hidden="true" size={20}/></span>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-primary-dark sm:text-3xl">{title}</h1>{unreadCount > 0 ? <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-primary-dark">{t("unreadCount", {count: unreadCount})}</span> : null}</div><p className="mt-1 text-sm leading-5 text-muted">{description}</p>{recipient ? <p className="mt-2 truncate text-xs font-medium text-primary">{recipient}</p> : null}</div>
          <button type="button" onClick={() => void refresh(true)} aria-label={t("refresh")} className="flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-white text-primary transition-colors hover:bg-mist-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><RefreshCw aria-hidden="true" size={17}/></button>
        </div>
        {accountStatus === "INACTIVE" ? <p className="mt-4 rounded-xl border border-accent-strong/30 bg-pale-blush px-3 py-2 text-sm leading-5 text-primary-dark">{t("inactiveNotice")}</p> : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,rgba(237,241,246,0.28),rgba(251,248,245,0.22))]">
        <div className="flex-1 space-y-3 overflow-y-auto px-3 py-5 sm:px-6 sm:py-6" role="log" aria-label={t("history")} aria-live="polite" aria-relevant="additions text">
          {loading ? <div className="flex min-h-52 items-center justify-center text-sm text-muted"><LoaderCircle className="mr-2 animate-spin motion-reduce:animate-none" size={18}/>{t("loading")}</div> : null}
          {!loading && messages.length === 0 ? <div className="flex min-h-56 flex-col items-center justify-center px-4 text-center"><span className="flex size-14 items-center justify-center rounded-2xl bg-pale-blush text-primary"><MessageCircle aria-hidden="true" size={23}/></span><h2 className="mt-4 font-display text-xl font-semibold text-primary-dark">{t("emptyTitle")}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-muted">{t("emptyBody")}</p></div> : null}
          {messages.map((message) => <article key={message.id} className={`flex ${message.isMine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] min-w-0 rounded-2xl px-3.5 py-3 shadow-sm sm:max-w-[78%] sm:px-4 ${message.isMine ? "rounded-br-md bg-primary text-white" : "rounded-bl-md border border-primary/8 bg-white text-text"}`}>
              {recipient && !message.isMine ? <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-primary/70">{t("memberLabel")}</p> : null}
              <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p>
              <p className={`mt-2 flex items-center justify-end gap-1 text-[11px] ${message.isMine ? "text-white/75" : "text-muted"}`}><time dateTime={message.createdAt}>{date(message.createdAt)}</time>{message.isMine && message.readAt ? <Check aria-label={t("read")} size={13}/> : null}</p>
            </div>
          </article>)}
          <div ref={bottomRef}/>
        </div>

        {error ? <div role="alert" className="mx-3 mb-2 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900 sm:mx-6"><span>{error === "load" ? t("loadError") : error === "rateLimited" ? t("rateLimited") : t("sendError")}</span><button type="button" onClick={() => void refresh(true)} className="min-h-10 shrink-0 rounded-lg px-2 font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{t("retry")}</button></div> : null}
        <form onSubmit={submit} className="border-t border-border bg-white p-3 sm:px-5 sm:py-4">
          <label htmlFor="message-composer" className="sr-only">{t("composerLabel")}</label>
          <div className="flex items-end gap-2 rounded-2xl border border-primary/15 bg-background p-2 shadow-inner focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/15">
            <textarea id="message-composer" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={4000} rows={2} placeholder={accountStatus === "INACTIVE" ? t("inactiveNotice") : t("placeholder")} disabled={accountStatus === "INACTIVE"} className="min-h-11 max-h-36 min-w-0 flex-1 resize-y bg-transparent px-2 py-2 text-sm leading-5 text-text placeholder:text-muted/80 focus:outline-none disabled:cursor-not-allowed"/>
            <button type="submit" disabled={disabled} className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 sm:px-4">{sending ? <LoaderCircle aria-hidden="true" size={18} className="animate-spin motion-reduce:animate-none"/> : <><span className="hidden sm:inline">{t("send")}</span><ArrowUp aria-hidden="true" size={18}/></>}</button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 px-1 text-[11px] leading-4 text-muted"><span>{t("privacyNote")}</span><span aria-live="polite">{draft.length}/4000</span></div>
        </form>
      </div>
    </section>
  </main>;
}
