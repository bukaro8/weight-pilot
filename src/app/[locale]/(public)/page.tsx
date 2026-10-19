import Image from "next/image";
import {ArrowRight, HeartHandshake, MessageCircleMore, Route, ShieldCheck} from "lucide-react";
import {getTranslations, setRequestLocale} from "next-intl/server";
import lifestyleImage from "@/assets/images/Warm Office Conversation.png";
import {buttonVariants} from "@/components/ui/button";
import {Link} from "@/i18n/navigation";

export default async function HomePage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const steps = [
    {icon: HeartHandshake, title: "step1Title", body: "step1Body"},
    {icon: Route, title: "step2Title", body: "step2Body"},
    {icon: MessageCircleMore, title: "step3Title", body: "step3Body"},
  ] as const;
  const options = [
    {title: "option1Title", body: "option1Body"},
    {title: "option2Title", body: "option2Body"},
    {title: "option3Title", body: "option3Body"},
  ] as const;

  return (
    <main id="main-content" className="flex-1">
      <section className="relative overflow-hidden border-b border-primary/8">
        <div className="absolute left-1/2 top-0 -z-10 h-80 w-[56rem] -translate-x-1/2 rounded-full bg-pale-blush/70 blur-3xl"/>
        <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-18 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:gap-16 lg:px-10 lg:py-24 xl:py-28">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-accent-strong/25 bg-surface/80 px-3 py-2 text-[0.625rem] font-bold uppercase tracking-[0.13em] text-primary min-[375px]:text-[0.6875rem] min-[375px]:tracking-[0.16em] sm:text-xs"><span className="size-1.5 shrink-0 rounded-full bg-accent-strong"/>{t("eyebrow")}</p>
            <h1 className="mt-6 max-w-[13ch] font-display text-[2.75rem] font-semibold leading-[1.04] tracking-[-0.035em] text-primary-dark min-[375px]:text-5xl sm:text-6xl lg:text-[4.25rem] xl:text-[4.75rem]">{t("title")}</h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted sm:mt-7 sm:text-lg sm:leading-8">{t("intro")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:items-center">
              <Link href="/consultations" className={`${buttonVariants({size: "large"})} w-full sm:w-auto`}>{t("primaryCta")}<ArrowRight aria-hidden="true" className="ml-2" size={18}/></Link>
              <a href="#options" className={`${buttonVariants({variant: "secondary", size: "large"})} w-full sm:w-auto`}>{t("secondaryCta")}</a>
            </div>
            <div className="mt-8 flex items-start gap-2.5 text-sm leading-6 text-muted"><ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={18}/><p>{t("trust")}</p></div>
          </div>

          <figure className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="absolute -right-10 top-10 -z-10 size-32 rounded-full border border-accent-strong/30 sm:size-44" aria-hidden="true"/>
            <div className="absolute -bottom-8 -left-8 -z-10 size-28 rounded-full bg-accent/35 sm:size-36" aria-hidden="true"/>
            <div className="overflow-hidden rounded-[1.75rem] border border-primary/10 bg-surface shadow-[0_24px_70px_rgba(30,58,95,0.12)] sm:rounded-[2rem]">
              <div className="overflow-hidden bg-mist-blue">
                <Image
                  src={lifestyleImage}
                  alt={t("photoAlt")}
                  priority
                  placeholder="blur"
                  sizes="(min-width: 1280px) 530px, (min-width: 1024px) 42vw, (min-width: 640px) 512px, calc(100vw - 32px)"
                  className="h-auto w-full object-cover object-center transition-transform duration-700 motion-reduce:transition-none lg:hover:scale-[1.015]"
                />
              </div>
              <figcaption className="grid gap-2 border-t border-primary/8 px-5 py-5 sm:px-7 sm:py-6">
                <span className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-primary-hover">{t("photoEyebrow")}</span>
                <span className="max-w-md text-sm leading-6 text-muted">{t("photoCaption")}</span>
              </figcaption>
            </div>
          </figure>
        </div>
      </section>

      <section id="approach" className="scroll-mt-24 bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-22 lg:px-10 lg:py-26">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
            <div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-hover">{t("approachEyebrow")}</p><h2 className="mt-4 font-display text-4xl font-semibold leading-[1.08] tracking-[-0.025em] text-primary-dark sm:text-5xl">{t("approachTitle")}</h2><p className="mt-5 text-base leading-7 text-muted sm:text-lg sm:leading-8">{t("approachBody")}</p></div>
            <div className="grid gap-4 md:grid-cols-3">
              {steps.map(({icon: Icon, title, body}, i) => <article key={title} className="group rounded-[1.5rem] border border-primary/10 bg-background p-6 shadow-[0_10px_30px_rgba(30,58,95,0.05)] transition-[background-color,border-color,box-shadow] duration-200 hover:border-accent-strong/35 hover:bg-pale-blush/55 hover:shadow-[0_14px_36px_rgba(30,58,95,0.08)] lg:p-7"><div className="flex items-center justify-between"><div className="flex size-11 items-center justify-center rounded-xl bg-mist-blue text-primary transition-colors group-hover:bg-surface"><Icon aria-hidden="true" size={20}/></div><span className="font-display text-lg text-accent-strong">0{i + 1}</span></div><h3 className="mt-6 font-display text-2xl font-semibold leading-tight text-primary">{t(title)}</h3><p className="mt-3 text-[0.9375rem] leading-6 text-muted">{t(body)}</p></article>)}
            </div>
          </div>
        </div>
      </section>

      <section id="options" className="relative isolate overflow-hidden bg-primary-dark text-white">
        <div className="pointer-events-none absolute -right-28 -top-28 size-72 rounded-full border border-white/10" aria-hidden="true"/>
        <div className="pointer-events-none absolute -bottom-40 -left-32 size-80 rounded-full bg-primary/45 blur-3xl" aria-hidden="true"/>
        <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-22 lg:grid-cols-[.72fr_1.28fr] lg:gap-18 lg:px-10 lg:py-26">
          <div className="max-w-xl lg:pt-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{t("optionsEyebrow")}</p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.08] tracking-[-0.025em] text-white sm:text-5xl">{t("optionsTitle")}</h2>
            <p className="mt-5 text-base leading-7 text-white/80 sm:text-lg sm:leading-8">{t("optionsIntro")}</p>
          </div>
          <div className="border-y border-white/15">
            {options.map(({title, body}, index) => (
              <article key={title} className="grid gap-4 border-b border-white/15 py-7 last:border-b-0 sm:grid-cols-[3.25rem_1fr] sm:gap-6 sm:py-8">
                <span className="flex size-11 items-center justify-center rounded-full border border-accent/35 bg-white/5 font-display text-lg font-semibold text-accent" aria-hidden="true">0{index + 1}</span>
                <div>
                  <h3 className="font-display text-2xl font-semibold leading-tight text-white sm:text-[1.7rem]">{t(title)}</h3>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-base sm:leading-7">{t(body)}</p>
                </div>
              </article>
            ))}
            <p className="border-t border-white/15 py-5 text-xs leading-5 text-white/75">{t("optionsNote")}</p>
            <div className="border-t border-white/15 py-7 sm:flex sm:items-center sm:justify-between sm:gap-8">
              <div className="max-w-xl">
                <h3 className="font-display text-2xl font-semibold text-white">{t("optionsCtaTitle")}</h3>
                <p className="mt-2 text-sm leading-6 text-white/80 sm:text-base sm:leading-7">{t("optionsCtaBody")}</p>
              </div>
              <Link href="/consultations" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-accent/45 px-5 text-sm font-semibold text-white transition-[background-color,border-color,transform] duration-200 hover:border-accent hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary-dark active:translate-y-px sm:mt-0 sm:shrink-0">{t("optionsCta")}<ArrowRight aria-hidden="true" size={17}/></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-22 lg:px-10 lg:py-26">
          <div className="relative isolate overflow-hidden rounded-[1.75rem] border border-accent-strong/20 bg-pale-blush px-6 py-10 shadow-[0_18px_55px_rgba(30,58,95,0.08)] sm:px-10 sm:py-12 lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:gap-16 lg:px-14 lg:py-14">
            <div className="pointer-events-none absolute -right-20 -top-24 -z-10 size-64 rounded-full border border-accent-strong/25 bg-surface/30" aria-hidden="true"/>
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-hover">{t("finalEyebrow")}</p>
              <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.08] tracking-[-0.025em] text-primary-dark sm:text-5xl">{t("finalTitle")}</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">{t("finalBody")}</p>
              <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-primary"><ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0" size={17}/>{t("finalInvitation")}</p>
            </div>
            <Link href="/login" className={`${buttonVariants({size: "large"})} mt-8 w-full sm:w-auto lg:mt-0`}>{t("finalCta")}<ArrowRight aria-hidden="true" className="ml-2" size={18}/></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
