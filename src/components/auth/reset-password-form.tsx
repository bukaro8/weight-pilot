"use client";

import {Check, LoaderCircle} from "lucide-react";
import {useTranslations} from "next-intl";
import {useState, type FormEvent} from "react";

import {FormMessage, inputClassName} from "@/components/auth/auth-form-ui";
import {PasswordInput} from "@/components/auth/password-input";
import {Button} from "@/components/ui/button";
import {authClient} from "@/features/auth/client";
import {resetPasswordSchema} from "@/features/auth/validation";
import {Link} from "@/i18n/navigation";

export function ResetPasswordForm({token, invalidToken}: {token?: string; invalidToken?: boolean}) {
  const t = useTranslations("auth");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [complete, setComplete] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setError(undefined);
    const data = new FormData(event.currentTarget);
    const parsed = resetPasswordSchema.safeParse({password: data.get("password"), confirmPassword: data.get("confirmPassword")});
    if (!parsed.success) {
      const mismatch = parsed.error.issues.some((issue) => issue.message === "passwords_must_match");
      setError(mismatch ? t("validationPasswordMatch") : t("validationPassword"));
      return;
    }

    setPending(true);
    const result = await authClient.resetPassword({newPassword: parsed.data.password, token});
    setPending(false);
    if (result.error) setError(t("errorResetToken"));
    else setComplete(true);
  }

  if (complete) return <div className="space-y-6"><FormMessage success>{t("resetComplete")}</FormMessage><Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">{t("signInButton")}</Link></div>;
  if (!token || invalidToken) return <div className="space-y-6"><FormMessage>{t("errorResetToken")}</FormMessage><Link href="/forgot-password" className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">{t("requestNewLink")}</Link></div>;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && <FormMessage>{error}</FormMessage>}
      <div>
        <label htmlFor="new-password" className="mb-2 block text-sm font-semibold text-primary-dark">{t("newPasswordLabel")}</label>
        <PasswordInput id="new-password" name="password" autoComplete="new-password" required minLength={9} disabled={pending} className={inputClassName}/>
        <p className="mt-2 text-xs leading-5 text-muted">{t("passwordHint")}</p>
      </div>
      <div>
        <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-primary-dark">{t("confirmPasswordLabel")}</label>
        <PasswordInput id="confirm-password" name="confirmPassword" autoComplete="new-password" required minLength={9} disabled={pending} className={inputClassName}/>
      </div>
      <Button type="submit" size="large" disabled={pending} className="w-full">
        {pending ? <LoaderCircle aria-hidden="true" className="mr-2 animate-spin" size={19}/> : <Check aria-hidden="true" className="mr-2" size={19}/>}
        {pending ? t("saving") : t("resetPasswordButton")}
      </Button>
    </form>
  );
}
