import {getTranslations, setRequestLocale} from "next-intl/server";

import {AuthShell} from "@/components/auth/auth-shell";
import {ReactivationForm} from "@/components/invitations/reactivation-form";
import type {Locale} from "@/i18n/routing";

export default async function ReactivatePage({params, searchParams}: {params: Promise<{locale: Locale}>; searchParams: Promise<{code?: string}>}) {
  const {locale} = await params;
  const {code} = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return <AuthShell eyebrow={t("reactivationEyebrow")} title={t("reactivationTitle")} description={t("reactivationDescription")}><ReactivationForm initialCode={code}/></AuthShell>;
}
