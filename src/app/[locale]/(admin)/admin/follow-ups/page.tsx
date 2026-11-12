import {getTranslations, setRequestLocale} from "next-intl/server";

import {AdminFollowUps} from "@/components/admin/admin-follow-ups";
import {listAdminFollowUpCandidates} from "@/features/follow-ups/server";
import {publicInvitationOrigin} from "@/features/invitations/sharing";
import type {Locale} from "@/i18n/routing";
import {requireAdmin} from "@/lib/authorization";

export default async function AdminFollowUpsPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  await requireAdmin(locale, "/admin/follow-ups");
  const [candidates, t] = await Promise.all([listAdminFollowUpCandidates(), getTranslations("adminFollowUps")]);
  return <main id="main-content" className="px-4 py-7 sm:px-6 sm:py-10 xl:px-10"><div className="mx-auto max-w-6xl">
    <header className="rounded-[1.5rem] bg-primary-dark p-6 text-white shadow-[0_18px_45px_rgba(20,42,71,0.12)] sm:p-9">
      <p className="text-xs font-bold uppercase tracking-[0.17em] text-accent">{t("eyebrow")}</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{t("title")}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80">{t("description")}</p>
    </header>
    <AdminFollowUps initialCandidates={candidates} publicUrlReady={Boolean(publicInvitationOrigin(process.env.PUBLIC_APP_URL))}/>
  </div></main>;
}
