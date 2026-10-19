import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {Suspense} from "react";

import {AuthShell} from "@/components/auth/auth-shell";
import {AuthFormSkeleton} from "@/components/auth/auth-form-ui";
import {SignInForm} from "@/components/auth/sign-in-form";
import type {Locale} from "@/i18n/routing";

export async function generateMetadata({params}: {params: Promise<{locale: Locale}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "auth"});
  return {title: t("signInTitle"), description: t("signInDescription")};
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{locale: Locale}>;
  searchParams: Promise<{next?: string}>;
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return <AuthShell eyebrow={t("signInEyebrow")} title={t("signInTitle")} description={t("signInDescription")}><Suspense fallback={<AuthFormSkeleton/>}><SignInWithNext searchParams={searchParams}/></Suspense></AuthShell>;
}

async function SignInWithNext({searchParams}: {searchParams: Promise<{next?: string}>}) {
  const {next} = await searchParams;
  return <SignInForm nextPath={next}/>;
}
