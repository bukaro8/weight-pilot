import {getTranslations, setRequestLocale} from "next-intl/server";

import {AuthShell} from "@/components/auth/auth-shell";
import {VerificationForm} from "@/components/auth/verification-form";
import type {Locale} from "@/i18n/routing";

export default async function VerificationPendingPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return <AuthShell eyebrow={t("verificationEyebrow")} title={t("verificationPendingTitle")} description={t("verificationPendingDescription")}><VerificationForm/></AuthShell>;
}
