import {getTranslations, setRequestLocale} from "next-intl/server";

import {AuthShell} from "@/components/auth/auth-shell";
import {ForgotPasswordForm} from "@/components/auth/forgot-password-form";
import type {Locale} from "@/i18n/routing";

export default async function ForgotPasswordPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return <AuthShell eyebrow={t("recoveryEyebrow")} title={t("recoveryTitle")} description={t("recoveryDescription")}><ForgotPasswordForm/></AuthShell>;
}
