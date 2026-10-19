import {getTranslations, setRequestLocale} from "next-intl/server";

import {AuthShell} from "@/components/auth/auth-shell";
import {InvitationRegistrationForm} from "@/components/invitations/invitation-registration-form";
import type {Locale} from "@/i18n/routing";

export default async function RegisterPage({params, searchParams}: {params: Promise<{locale: Locale}>; searchParams: Promise<{code?: string}>}) {
  const {locale} = await params;
  const {code} = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return (
    <AuthShell eyebrow={t("registrationEyebrow")} title={t("registrationTitle")} description={t("registrationDescription")}>
      <InvitationRegistrationForm initialCode={code}/>
    </AuthShell>
  );
}
