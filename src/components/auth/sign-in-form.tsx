"use client";

import {ArrowRight, LoaderCircle} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";
import {useState, type FormEvent} from "react";

import {FormMessage, inputClassName} from "@/components/auth/auth-form-ui";
import {PasswordInput} from "@/components/auth/password-input";
import {Button} from "@/components/ui/button";
import {authClient} from "@/features/auth/client";
import {signInSchema} from "@/features/auth/validation";
import {Link, useRouter} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";

export function SignInForm({nextPath}: {nextPath?: string}) {
  const t = useTranslations("auth");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const data = new FormData(event.currentTarget);
    const parsed = signInSchema.safeParse({email: data.get("email"), password: data.get("password")});
    if (!parsed.success) {
      setError(t("validationInvalidCredentials"));
      return;
    }

    setPending(true);
    try {
      const result = await authClient.signIn.email(
        {...parsed.data, rememberMe: true},
        {timeout: 15_000},
      );
      if (result.error) {
        if (result.error.code === "EMAIL_NOT_VERIFIED") {
          router.push("/verify-email/pending", {locale});
        } else if (result.error.status === 429) {
          setError(t("errorRateLimited"));
        } else if (result.error.status >= 500 || result.error.status === 0) {
          setError(t("errorUnavailable"));
        } else {
          setError(t("errorInvalidCredentials"));
        }
        return;
      }
      const destinationResponse = await fetch(`/api/auth/destination${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`, {headers: {accept: "application/json"}});
      if (!destinationResponse.ok) throw new Error("DESTINATION_UNAVAILABLE");
      const destinationBody = await destinationResponse.json() as {destination?: string};
      if (!destinationBody.destination) throw new Error("DESTINATION_UNAVAILABLE");
      router.replace(destinationBody.destination, {locale});
      router.refresh();
    } catch {
      setError(t("errorUnavailable"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && <FormMessage>{error}</FormMessage>}
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-semibold text-primary-dark">{t("emailLabel")}</label>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required disabled={pending} className={inputClassName} placeholder={t("emailPlaceholder")}/>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label htmlFor="password" className="text-sm font-semibold text-primary-dark">{t("passwordLabel")}</label>
          <Link href="/forgot-password" className="inline-flex min-h-11 items-center rounded text-right text-sm font-semibold leading-5 text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline">{t("forgotLink")}</Link>
        </div>
        <PasswordInput id="password" name="password" autoComplete="current-password" required disabled={pending} className={inputClassName}/>
      </div>
      <Button type="submit" size="large" disabled={pending} className="w-full">
        {pending ? <LoaderCircle aria-hidden="true" className="mr-2 animate-spin" size={19}/> : <ArrowRight aria-hidden="true" className="mr-2" size={19}/>}
        {pending ? t("signingIn") : t("signInButton")}
      </Button>
      <p className="text-center text-sm leading-6 text-muted">{t("invitedQuestion")} <Link href="/register" className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">{t("registrationLink")}</Link></p>
    </form>
  );
}
