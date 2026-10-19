import {ArrowLeft, ClipboardList, LockKeyhole, type LucideIcon, MessageCircleMore, PanelsTopLeft} from "lucide-react";
import {getTranslations} from "next-intl/server";
import {Link} from "@/i18n/navigation";
import {buttonVariants} from "@/components/ui/button";

const icons: Record<"auth" | "consultations" | "messages" | "admin", LucideIcon> = {auth: LockKeyhole, consultations: ClipboardList, messages: MessageCircleMore, admin: PanelsTopLeft};

export async function PlaceholderPage({namespace}: {namespace: keyof typeof icons}) {
  const t = await getTranslations(namespace);
  const common = await getTranslations("placeholder");
  const Icon = icons[namespace];
  return (
    <main id="main-content" className="relative flex flex-1 items-center overflow-hidden px-4 py-14 sm:px-6 sm:py-20 lg:px-10">
      <div className="absolute inset-x-0 top-0 -z-10 h-56 bg-pale-blush/45"/>
      <div className="mx-auto w-full max-w-3xl">
        <div className="overflow-hidden rounded-[1.5rem] border border-primary/10 bg-surface shadow-[0_24px_70px_rgba(30,58,95,0.09)] sm:rounded-[2rem]">
          <div className="h-1.5 bg-accent"/>
          <div className="p-6 min-[375px]:p-7 sm:p-12">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-mist-blue text-primary sm:size-14"><Icon aria-hidden="true" size={24}/></div>
            <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-primary-hover">{common("comingSoon")}</p>
            <h1 className="mt-3 max-w-xl font-display text-[2.5rem] font-semibold leading-[1.08] tracking-[-0.025em] text-primary-dark sm:text-5xl">{t("title")}</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">{t("description")}</p>
            <div className="mt-8 rounded-2xl border border-primary/8 bg-mist-blue/65 p-4 sm:p-5"><p className="text-sm leading-6 text-muted">{common("phase")}</p></div>
            <Link href="/" className={`${buttonVariants({variant: "secondary"})} mt-8`}><ArrowLeft aria-hidden="true" className="mr-2" size={17}/>{common("backHome")}</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
