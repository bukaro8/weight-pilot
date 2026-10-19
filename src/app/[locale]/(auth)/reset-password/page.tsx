import {getTranslations, setRequestLocale} from "next-intl/server";
import {Suspense} from "react";

import {AuthShell} from "@/components/auth/auth-shell";
import {AuthFormSkeleton} from "@/components/auth/auth-form-ui";
import {ResetPasswordForm} from "@/components/auth/reset-password-form";
import type {Locale} from "@/i18n/routing";

export default async function ResetPasswordPage({params, searchParams}: {params: Promise<{locale: Locale}>; searchParams: Promise<{token?: string; error?: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return <AuthShell eyebrow={t("resetEyebrow")} title={t("resetTitle")} description={t("resetDescription")}><Suspense fallback={<AuthFormSkeleton/>}><ResetPasswordWithToken searchParams={searchParams}/></Suspense></AuthShell>;
}

async function ResetPasswordWithToken({searchParams}: {searchParams: Promise<{token?: string; error?: string}>}) {
  const query = await searchParams;
  return <ResetPasswordForm token={query.token} invalidToken={Boolean(query.error)}/>;
}
