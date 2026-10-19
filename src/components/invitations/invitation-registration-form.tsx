"use client";

import {ArrowRight, CheckCircle2, LoaderCircle} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";
import {useState, type FormEvent} from "react";

import {FormMessage, inputClassName} from "@/components/auth/auth-form-ui";
import {PasswordInput} from "@/components/auth/password-input";
import {Button} from "@/components/ui/button";
import {invitationRegistrationSchema} from "@/features/invitations/validation";
import {Link} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";

export function InvitationRegistrationForm({initialCode = ""}: {initialCode?: string}) {
  const t = useTranslations("auth");
  const locale = useLocale() as Locale;
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("confirmPassword")) {
      setError(t("validationPasswordMatch"));
      return;
    }
    const parsed = invitationRegistrationSchema.safeParse({
      code: data.get("code"), name: data.get("name"), email: data.get("email"),
      password: data.get("password"), preferredLanguage: locale,
    });
    if (!parsed.success) {
      setError(t("registrationValidation"));
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/invitations/register", {
        method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(parsed.data),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as {error?: string};
        setError(body.error === "INVITATION_RATE_LIMITED" ? t("invitationRateLimited") : t("registrationError"));
        return;
      }
      setComplete(true);
    } finally {
      setPending(false);
    }
  }

  if (complete) return (
    <div className="rounded-2xl border border-primary/10 bg-mist-blue/60 p-5 text-center sm:p-6" role="status">
      <CheckCircle2 className="mx-auto text-primary" aria-hidden="true" size={32}/>
      <h2 className="mt-4 font-display text-2xl font-semibold text-primary-dark">{t("registrationCompleteTitle")}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{t("registrationCompleteBody")}</p>
      <Link href="/verify-email/pending" className="mt-5 inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">{t("verificationPendingLink")}</Link>
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && <FormMessage>{error}</FormMessage>}
      <div>
        <label htmlFor="invitation-code" className="mb-2 block text-sm font-semibold text-primary-dark">{t("invitationCodeLabel")}</label>
        <input id="invitation-code" name="code" defaultValue={initialCode} autoComplete="off" required disabled={pending} className={inputClassName} placeholder={t("invitationCodePlaceholder")}/>
      </div>
      <div>
        <label htmlFor="full-name" className="mb-2 block text-sm font-semibold text-primary-dark">{t("fullNameLabel")}</label>
        <input id="full-name" name="name" autoComplete="name" required disabled={pending} className={inputClassName}/>
      </div>
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-semibold text-primary-dark">{t("emailLabel")}</label>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required disabled={pending} className={inputClassName} placeholder={t("emailPlaceholder")}/>
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-semibold text-primary-dark">{t("passwordLabel")}</label>
        <PasswordInput id="password" name="password" autoComplete="new-password" required disabled={pending} className={inputClassName}/>
        <p className="mt-2 text-xs leading-5 text-muted">{t("passwordHint")}</p>
      </div>
      <div>
        <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-primary-dark">{t("confirmPasswordLabel")}</label>
        <PasswordInput id="confirm-password" name="confirmPassword" autoComplete="new-password" required disabled={pending} className={inputClassName}/>
      </div>
      <Button type="submit" size="large" disabled={pending} className="w-full">
        {pending ? <LoaderCircle className="mr-2 animate-spin" aria-hidden="true" size={19}/> : <ArrowRight className="mr-2" aria-hidden="true" size={19}/>} {pending ? t("creatingAccount") : t("createAccount")}
      </Button>
      <p className="text-center text-sm leading-6 text-muted">{t("inactiveQuestion")} <Link href={{pathname: "/reactivate", query: initialCode ? {code: initialCode} : {}}} className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">{t("reactivateLink")}</Link></p>
    </form>
  );
}
