import {ShieldCheck} from "lucide-react";
import {getTranslations} from "next-intl/server";

export async function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations("auth");
  return (
    <main id="main-content" className="relative flex flex-1 items-center overflow-hidden px-4 py-10 sm:px-6 sm:py-16 lg:px-10">
      <div className="absolute inset-x-0 top-0 -z-20 h-72 bg-pale-blush/70"/>
      <div className="absolute -right-28 top-28 -z-10 size-72 rounded-full bg-accent/25 blur-3xl"/>
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[1.5rem] border border-primary/10 bg-surface shadow-[0_26px_80px_rgba(20,42,71,0.11)] lg:grid-cols-[0.86fr_1.14fr] lg:rounded-[2rem]">
        <aside className="relative hidden overflow-hidden bg-primary-dark p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -bottom-20 -right-20 size-64 rounded-full border border-white/10"/>
          <div>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-accent"><ShieldCheck aria-hidden="true" size={24}/></div>
            <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-accent">{t("secureEyebrow")}</p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-[-0.025em]">{t("secureTitle")}</h2>
            <p className="mt-5 text-[15px] leading-7 text-white/75">{t("secureBody")}</p>
          </div>
          <p className="relative mt-14 border-t border-white/15 pt-6 text-xs leading-5 text-white/65">{t("secureNote")}</p>
        </aside>
        <section className="p-5 min-[375px]:p-7 sm:p-10 lg:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-hover">{eyebrow}</p>
          <h1 className="mt-3 font-display text-[2.35rem] font-semibold leading-[1.08] tracking-[-0.025em] text-primary-dark sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-muted sm:text-base">{description}</p>
          <div className="mt-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
