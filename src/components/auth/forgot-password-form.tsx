"use client";

import {LoaderCircle, Mail} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";
import {useState, type FormEvent} from "react";

import {FormMessage, inputClassName} from "@/components/auth/auth-form-ui";
import {Button} from "@/components/ui/button";
import {authClient} from "@/features/auth/client";
import {emailSchema} from "@/features/auth/validation";
import {Link} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const locale = useLocale() as Locale;
  const [pending, setPending] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInvalid(false);
    const email = new FormData(event.currentTarget).get("email");
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setInvalid(true);
      return;
    }

    setPending(true);
    try {
      await authClient.requestPasswordReset({email: parsed.data, redirectTo: `/${locale}/reset-password`});
    } finally {
      // The same response is shown for existing and unknown addresses.
      setPending(false);
      setSent(true);
    }
  }

  if (sent) return <div className="space-y-6"><FormMessage success>{t("resetRequestSuccess")}</FormMessage><Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">{t("backToSignIn")}</Link></div>;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {invalid && <FormMessage>{t("validationEmail")}</FormMessage>}
      <div>
        <label htmlFor="recovery-email" className="mb-2 block text-sm font-semibold text-primary-dark">{t("emailLabel")}</label>
        <input id="recovery-email" name="email" type="email" autoComplete="email" inputMode="email" required disabled={pending} className={inputClassName} placeholder={t("emailPlaceholder")}/>
      </div>
      <Button type="submit" size="large" disabled={pending} className="w-full">
        {pending ? <LoaderCircle aria-hidden="true" className="mr-2 animate-spin" size={19}/> : <Mail aria-hidden="true" className="mr-2" size={19}/>}
        {pending ? t("sending") : t("sendResetButton")}
      </Button>
      <Link href="/login" className="mx-auto flex min-h-11 w-fit items-center font-semibold text-primary underline-offset-4 hover:underline">{t("backToSignIn")}</Link>
    </form>
  );
}
