"use client";

import {CheckCircle2, LoaderCircle, RefreshCcw} from "lucide-react";
import {useTranslations} from "next-intl";
import {useState, type FormEvent} from "react";

import {FormMessage, inputClassName} from "@/components/auth/auth-form-ui";
import {PasswordInput} from "@/components/auth/password-input";
import {Button} from "@/components/ui/button";
import {invitationReactivationSchema} from "@/features/invitations/validation";
import {Link} from "@/i18n/navigation";

export function ReactivationForm({initialCode = ""}: {initialCode?: string}) {
  const t = useTranslations("auth");
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const data = new FormData(event.currentTarget);
    const parsed = invitationReactivationSchema.safeParse({code: data.get("code"), email: data.get("email"), password: data.get("password")});
    if (!parsed.success) { setError(t("reactivationValidation")); return; }
    setPending(true);
    try {
      const response = await fetch("/api/invitations/reactivate", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(parsed.data)});
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as {error?: string};
        setError(body.error === "INVITATION_RATE_LIMITED" ? t("invitationRateLimited") : t("reactivationError"));
        return;
      }
      setComplete(true);
    } finally { setPending(false); }
  }

  if (complete) return (
    <div className="rounded-2xl border border-primary/10 bg-mist-blue/60 p-5 text-center sm:p-6" role="status">
      <CheckCircle2 className="mx-auto text-primary" aria-hidden="true" size={32}/>
      <h2 className="mt-4 font-display text-2xl font-semibold text-primary-dark">{t("reactivationCompleteTitle")}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{t("reactivationCompleteBody")}</p>
      <Link href="/login" className="mt-5 inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">{t("backToSignIn")}</Link>
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && <FormMessage>{error}</FormMessage>}
      <div><label htmlFor="reactivation-code" className="mb-2 block text-sm font-semibold text-primary-dark">{t("invitationCodeLabel")}</label><input id="reactivation-code" name="code" defaultValue={initialCode} autoComplete="off" required disabled={pending} className={inputClassName} placeholder={t("invitationCodePlaceholder")}/></div>
      <div><label htmlFor="reactivation-email" className="mb-2 block text-sm font-semibold text-primary-dark">{t("emailLabel")}</label><input id="reactivation-email" name="email" type="email" autoComplete="email" required disabled={pending} className={inputClassName} placeholder={t("emailPlaceholder")}/></div>
      <div><label htmlFor="reactivation-password" className="mb-2 block text-sm font-semibold text-primary-dark">{t("passwordLabel")}</label><PasswordInput id="reactivation-password" name="password" autoComplete="current-password" required disabled={pending} className={inputClassName}/></div>
      <Button type="submit" size="large" disabled={pending} className="w-full">{pending ? <LoaderCircle className="mr-2 animate-spin" aria-hidden="true" size={19}/> : <RefreshCcw className="mr-2" aria-hidden="true" size={18}/>} {pending ? t("reactivating") : t("reactivateButton")}</Button>
    </form>
  );
}
