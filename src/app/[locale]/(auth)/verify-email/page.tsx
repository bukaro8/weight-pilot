import {BadgeCheck} from "lucide-react";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {Suspense} from "react";

import {AuthShell} from "@/components/auth/auth-shell";
import {AuthFormSkeleton} from "@/components/auth/auth-form-ui";
import {buttonVariants} from "@/components/ui/button";
import {Link} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";

export default async function VerifyEmailPage({params, searchParams}: {params: Promise<{locale: Locale}>; searchParams: Promise<{verified?: string; error?: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return <AuthShell eyebrow={t("verificationEyebrow")} title={t("verificationPageTitle")} description={t("verificationPageDescription")}><Suspense fallback={<AuthFormSkeleton/>}><VerificationResult searchParams={searchParams}/></Suspense></AuthShell>;
}

async function VerificationResult({searchParams}: {searchParams: Promise<{verified?: string; error?: string}>}) {
  const query = await searchParams;
  const t = await getTranslations("auth");
  const successful = query.verified === "1" && !query.error;
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-primary-dark">{successful ? t("verificationCompleteTitle") : t("verificationProblemTitle")}</h2>
      <p className="mt-3 text-sm leading-6 text-muted">{successful ? t("verificationCompleteDescription") : t("verificationProblemDescription")}</p>
      <div className="mt-6 flex size-14 items-center justify-center rounded-2xl bg-mist-blue text-primary"><BadgeCheck aria-hidden="true" size={28}/></div>
      <Link href={successful ? "/login" : "/verify-email/pending"} className={`${buttonVariants({size: "large"})} mt-6 w-full`}>{successful ? t("signInButton") : t("requestNewLink")}</Link>
    </div>
  );
}
