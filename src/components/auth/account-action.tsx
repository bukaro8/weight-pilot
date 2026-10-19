"use client";

import {LogOut, LoaderCircle} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";
import {useState} from "react";

import {buttonVariants} from "@/components/ui/button";
import {authClient} from "@/features/auth/client";
import {Link, useRouter} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";
import {cn} from "@/lib/utils";

export function AccountAction({className, tabIndex, onNavigate}: {className?: string; tabIndex?: number; onNavigate?: () => void}) {
  const t = useTranslations("nav");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const {data: session, isPending} = authClient.useSession();
  const [signingOut, setSigningOut] = useState(false);

  if (isPending) return <span aria-hidden="true" className={cn(buttonVariants({variant: "secondary"}), "min-w-24 opacity-50", className)}/>;
  if (!session) return <Link href="/login" tabIndex={tabIndex} onClick={onNavigate} className={cn(buttonVariants(), className)}>{t("signIn")}</Link>;

  return (
    <button
      type="button"
      tabIndex={tabIndex}
      disabled={signingOut}
      className={cn(buttonVariants({variant: "secondary"}), className)}
      onClick={async () => {
        setSigningOut(true);
        await authClient.signOut({fetchOptions: {onSuccess: () => {
          onNavigate?.();
          router.replace("/", {locale});
          router.refresh();
        }}});
        setSigningOut(false);
      }}
    >
      {signingOut ? <LoaderCircle aria-hidden="true" className="mr-2 animate-spin" size={17}/> : <LogOut aria-hidden="true" className="mr-2" size={17}/>}
      {signingOut ? t("signingOut") : t("signOut")}
    </button>
  );
}
