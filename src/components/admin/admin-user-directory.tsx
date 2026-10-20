"use client";

import {Eye, Search, UserRoundSearch, X} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";
import {useMemo, useState} from "react";

import {buttonVariants} from "@/components/ui/button";
import {filterAdminUsers, type UserStatusFilter, type VerificationFilter} from "@/features/admin/filters";
import type {AdminUserDirectoryEntry} from "@/features/admin/types";
import {Link} from "@/i18n/navigation";
import {cn} from "@/lib/utils";

const controlClass = "min-h-11 w-full rounded-xl border border-primary/15 bg-surface px-3.5 text-sm text-primary-dark outline-none transition-[border-color,box-shadow] focus:border-primary/45 focus:ring-2 focus:ring-primary/15";

export function AdminUserDirectory({initialUsers}: {initialUsers: AdminUserDirectoryEntry[]}) {
  const t = useTranslations("adminUsers");
  const userDetail = useTranslations("adminUserDetail");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<UserStatusFilter>("ALL");
  const [verification, setVerification] = useState<VerificationFilter>("ALL");
  const users = useMemo(() => filterAdminUsers(initialUsers, query, status, verification), [initialUsers, query, status, verification]);
  const formatter = useMemo(() => new Intl.DateTimeFormat(locale, {dateStyle: "medium", timeZone: "Europe/London"}), [locale]);
  const filtersActive = Boolean(query || status !== "ALL" || verification !== "ALL");

  const reset = () => {setQuery(""); setStatus("ALL"); setVerification("ALL");};
  return <main id="main-content" className="px-4 py-7 sm:px-6 sm:py-10 xl:px-10"><div className="mx-auto max-w-7xl">
    <header><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-hover">{t("eyebrow")}</p><h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em] text-primary-dark sm:text-5xl">{t("title")}</h1><p className="mt-4 max-w-2xl leading-7 text-muted">{t("description")}</p></header>
    <section aria-labelledby="directory-filters" className="mt-7 rounded-2xl border border-primary/10 bg-surface p-4 shadow-[0_8px_24px_rgba(20,42,71,0.04)] sm:p-5"><h2 id="directory-filters" className="sr-only">{t("filtersTitle")}</h2><div className="grid gap-3 lg:grid-cols-[minmax(15rem,1fr)_13rem_13rem_auto] lg:items-end"><div><label htmlFor="user-search" className="mb-2 block text-sm font-semibold text-primary-dark">{t("searchLabel")}</label><div className="relative"><Search className="pointer-events-none absolute left-3.5 top-3.5 text-muted" aria-hidden="true" size={17}/><input id="user-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} className={`${controlClass} pl-10`}/></div></div><FilterSelect id="status-filter" label={t("statusFilter")} value={status} onChange={(value) => setStatus(value as UserStatusFilter)} options={["ALL", "ACTIVE", "INACTIVE"]} t={t}/><FilterSelect id="verification-filter" label={t("verificationFilter")} value={verification} onChange={(value) => setVerification(value as VerificationFilter)} options={["ALL", "VERIFIED", "UNVERIFIED"]} t={t}/><button type="button" disabled={!filtersActive} onClick={reset} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-primary transition-colors hover:bg-mist-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40"><X aria-hidden="true" size={16}/>{t("clear")}</button></div><p className="mt-4 text-sm text-muted" role="status">{t("resultCount", {count: users.length})}</p></section>

    {users.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-primary/20 bg-mist-blue/25 px-5 py-12 text-center"><UserRoundSearch className="mx-auto text-primary/55" aria-hidden="true" size={32}/><h2 className="mt-4 font-display text-2xl font-semibold text-primary-dark">{t(filtersActive ? "emptyFilteredTitle" : "emptyTitle")}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{t(filtersActive ? "emptyFilteredBody" : "emptyBody")}</p>{filtersActive && <button type="button" onClick={reset} className="mt-5 min-h-11 rounded-full border border-primary/20 px-5 text-sm font-semibold text-primary">{t("clear")}</button>}</div> : <>
      <div className="mt-6 grid gap-4 lg:hidden">{users.map((entry) => <UserCard key={entry.id} entry={entry} formatter={formatter} t={t} viewLabel={userDetail("viewUser")}/>)}</div>
      <div className="mt-6 hidden overflow-hidden rounded-2xl border border-primary/10 bg-surface shadow-[0_10px_30px_rgba(20,42,71,0.04)] lg:block"><div className="overflow-x-auto"><table className="w-full min-w-[64rem] border-collapse text-left text-sm"><thead className="bg-mist-blue/70 text-xs font-bold uppercase tracking-[0.08em] text-primary"><tr><th className="px-5 py-4">{t("member")}</th><th className="px-5 py-4">{t("registered")}</th><th className="px-5 py-4">{t("account")}</th><th className="px-5 py-4">{t("referral")}</th><th className="px-5 py-4">{t("reviews")}</th><th className="px-5 py-4"><span className="sr-only">{userDetail("viewUser")}</span></th></tr></thead><tbody className="divide-y divide-border">{users.map((entry) => <tr key={entry.id} className="align-top transition-colors hover:bg-background"><td className="px-5 py-4"><p className="font-semibold text-primary-dark">{entry.name}</p><p className="mt-1 break-all text-xs text-muted">{entry.email}</p><span className="mt-2 inline-flex rounded-full bg-mist-blue px-2 py-1 text-[0.6875rem] font-bold uppercase text-primary">{entry.preferredLanguage}</span></td><td className="px-5 py-4 text-muted">{formatter.format(new Date(entry.createdAt))}</td><td className="px-5 py-4"><AccountBadges entry={entry} t={t}/></td><td className="px-5 py-4 text-muted">{entry.referralSource ? <><p className="font-medium text-primary-dark">{entry.referralSource.name}</p><p className="mt-1 break-all text-xs">{entry.referralSource.email}</p></> : t("direct")}</td><td className="px-5 py-4"><ReviewLinks entry={entry} t={t}/></td><td className="px-5 py-4"><ViewUserLink id={entry.id} label={userDetail("viewUser")}/></td></tr>)}</tbody></table></div></div>
    </>}
  </div></main>;
}

function FilterSelect({id, label, value, onChange, options, t}: {id: string; label: string; value: string; onChange: (value: string) => void; options: readonly string[]; t: ReturnType<typeof useTranslations>}) {
  return <div><label htmlFor={id} className="mb-2 block text-sm font-semibold text-primary-dark">{label}</label><select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={controlClass}>{options.map((option) => <option key={option} value={option}>{t(`filters.${option}`)}</option>)}</select></div>;
}

function UserCard({entry, formatter, t, viewLabel}: {entry: AdminUserDirectoryEntry; formatter: Intl.DateTimeFormat; t: ReturnType<typeof useTranslations>; viewLabel: string}) {
  return <article className="rounded-2xl border border-primary/10 bg-surface p-5 shadow-[0_8px_24px_rgba(20,42,71,0.04)]"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-display text-2xl font-semibold text-primary-dark">{entry.name}</h2><p className="mt-1 break-all text-xs text-muted">{entry.email}</p></div><span className="rounded-full bg-mist-blue px-2.5 py-1 text-xs font-bold uppercase text-primary">{entry.preferredLanguage}</span></div><dl className="mt-5 grid gap-4 text-sm min-[420px]:grid-cols-2"><div><dt className="font-semibold text-primary-dark">{t("registered")}</dt><dd className="mt-1 text-muted">{formatter.format(new Date(entry.createdAt))}</dd></div><div><dt className="font-semibold text-primary-dark">{t("account")}</dt><dd className="mt-2"><AccountBadges entry={entry} t={t}/></dd></div><div><dt className="font-semibold text-primary-dark">{t("referral")}</dt><dd className="mt-1 text-muted">{entry.referralSource ? <>{entry.referralSource.name}<br/><span className="break-all text-xs">{entry.referralSource.email}</span></> : t("direct")}</dd></div><div><dt className="font-semibold text-primary-dark">{t("reviews")}</dt><dd className="mt-2"><ReviewLinks entry={entry} t={t}/></dd></div></dl><div className="mt-5 border-t border-border pt-4"><ViewUserLink id={entry.id} label={viewLabel}/></div></article>;
}

function ViewUserLink({id, label}: {id: string; label: string}) { return <Link href={`/admin/users/${id}`} className={`${buttonVariants({variant: "secondary"})} w-full whitespace-nowrap`}><Eye className="mr-2" aria-hidden="true" size={17}/>{label}</Link>; }

function AccountBadges({entry, t}: {entry: AdminUserDirectoryEntry; t: ReturnType<typeof useTranslations>}) {
  return <div className="flex flex-wrap gap-1.5"><StatusBadge tone={entry.status === "ACTIVE" ? "positive" : "neutral"}>{t(`status.${entry.status}`)}</StatusBadge><StatusBadge tone={entry.emailVerified ? "positive" : "warning"}>{t(entry.emailVerified ? "verified" : "unverified")}</StatusBadge></div>;
}

function StatusBadge({tone, children}: {tone: "positive" | "neutral" | "warning"; children: React.ReactNode}) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-bold", tone === "positive" && "bg-emerald-50 text-emerald-800", tone === "neutral" && "bg-mist-blue text-primary", tone === "warning" && "bg-amber-50 text-amber-900")}>{children}</span>;
}

function ReviewLinks({entry, t}: {entry: AdminUserDirectoryEntry; t: ReturnType<typeof useTranslations>}) {
  if (!entry.reviewRequests.length) return <span className="text-muted">{t("noReviews")}</span>;
  return <div className="flex flex-col items-start gap-1">{entry.reviewRequests.map((review) => <Link key={review.id} href={`/admin/questionnaires/${review.id}`} className="inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{t("openReview", {status: t(`reviewStatus.${review.status}`)})}</Link>)}</div>;
}
