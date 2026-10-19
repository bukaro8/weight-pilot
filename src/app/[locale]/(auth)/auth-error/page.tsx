import {LockKeyhole} from "lucide-react";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {Suspense} from "react";

import {AuthShell} from "@/components/auth/auth-shell";
import {AuthFormSkeleton} from "@/components/auth/auth-form-ui";
import {buttonVariants} from "@/components/ui/button";
import {Link} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";

const validReasons = ["inactive", "unverified", "forbidden"] as const;

export default async function AuthErrorPage({params, searchParams}: {params: Promise<{locale: Locale}>; searchParams: Promise<{reason?: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return <AuthShell eyebrow={t("accessEyebrow")} title={t("accessTitle")} description={t("accessDescription")}><Suspense fallback={<AuthFormSkeleton/>}><AccessError searchParams={searchParams}/></Suspense></AuthShell>;
}

async function AccessError({searchParams}: {searchParams: Promise<{reason?: string}>}) {
  const query = await searchParams;
  const t = await getTranslations("auth");
  const reason = validReasons.find((item) => item === query.reason) ?? "forbidden";
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-primary-dark">{t(`${reason}Title`)}</h2>
      <p className="mt-3 text-sm leading-6 text-muted">{t(`${reason}Description`)}</p>
      <div className="mt-6 flex size-14 items-center justify-center rounded-2xl bg-pale-blush text-primary"><LockKeyhole aria-hidden="true" size={27}/></div>
      <Link href={reason === "unverified" ? "/verify-email/pending" : reason === "inactive" ? "/reactivate" : "/login"} className={`${buttonVariants({size: "large"})} mt-6 w-full`}>{reason === "unverified" ? t("resendVerification") : reason === "inactive" ? t("reactivateLink") : t("backToSignIn")}</Link>
    </div>
  );
}
