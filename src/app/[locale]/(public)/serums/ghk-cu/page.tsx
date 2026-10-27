import type {Metadata} from "next";
import Image from "next/image";
import {ArrowDown, Atom, Droplets, Hand, Moon, ShieldCheck, SunDim} from "lucide-react";
import {getTranslations, setRequestLocale} from "next-intl/server";

import serumImage from "@/assets/images/WeightPilot Copper Renew Serum.png";
import {buttonVariants} from "@/components/ui/button";
import "./serum.css";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "serum"});
  const canonical = locale === "es" ? "/es/serums/ghk-cu" : "/serums/ghk-cu";
  return {
    title: t("title"),
    description: t("description"),
    alternates: {canonical, languages: {en: "/serums/ghk-cu", es: "/es/serums/ghk-cu"}},
    openGraph: {
      type: "website", siteName: "WeightPilot", locale: locale === "es" ? "es_ES" : "en_GB",
      url: canonical, title: t("title"), description: t("description"),
      images: [{url: serumImage.src, width: serumImage.width, height: serumImage.height, alt: t("imageAlt")}],
    },
    twitter: {card: "summary_large_image", title: t("title"), description: t("description"), images: [serumImage.src]},
  };
}

export default async function SerumPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("serum");
  const heading = "wp-serum-heading font-display text-2xl font-semibold leading-tight text-primary-dark sm:text-3xl";
  const actives = [
    {key: "copper", icon: Atom, orb: ""},
    {key: "ectoin", icon: ShieldCheck, orb: "wp-serum-copper-orb"},
    {key: "hyaluronic", icon: Droplets, orb: "wp-serum-clear-orb"},
  ] as const;

  return (
    <main id="main-content" className="wp-serum-page flex-1">
      <header className="wp-serum-hero">
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-7 sm:px-8 sm:pb-16 sm:pt-8 lg:px-10">
          <p className="wp-serum-copper relative z-10 text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:text-xs">{t("eyebrow")} · {t("size")}</p>
          <div className="grid grid-cols-[1.5fr_.5fr] items-center gap-2 sm:grid-cols-2 sm:gap-8">
            <div className="relative z-10 min-w-0 py-5 sm:py-8">
              <p className="wp-serum-collection font-display font-semibold">{t("collection")}</p>
              <h1 className="mt-5 max-w-md font-display text-xl font-semibold leading-tight text-primary-dark min-[375px]:text-2xl sm:text-3xl lg:text-4xl">{t("title")}</h1>
              <p className="mt-3 max-w-sm text-sm font-medium leading-6 text-primary sm:text-base sm:leading-7">{t("formula")}</p>
              <a href="#how-to-use" className={`${buttonVariants()} mt-5 gap-2 sm:mt-7`}>{t("howTo")}<ArrowDown size={16} aria-hidden="true"/></a>
            </div>
            <div className="wp-serum-product">
              <Image src={serumImage} alt={t("imageAlt")} preload placeholder="blur" sizes="(min-width: 640px) 400px, 240px" className="wp-serum-product-image object-contain"/>
            </div>
          </div>
        </div>
      </header>

      <div className="relative mx-auto -mt-5 max-w-6xl space-y-5 px-4 pb-10 sm:-mt-6 sm:space-y-7 sm:px-8 sm:pb-16 lg:px-10">
        <section id="how-to-use" aria-labelledby="how-to-title" className="wp-serum-panel scroll-mt-24 p-5 sm:p-8">
          <p className="wp-serum-copper mb-3 flex items-center gap-2 text-sm font-semibold"><Moon size={18} aria-hidden="true"/>{t("night")}</p>
          <h2 id="how-to-title" className={heading}>{t("howTo")}</h2>
          <p className="mt-4 rounded-xl border border-accent/40 bg-pale-blush/65 px-4 py-3 text-sm font-medium leading-6 text-primary">{t("frequency")}</p>
          <ol className="mt-3 list-none divide-y divide-border/65" role="list">
            {(["wash", "apply", "spread", "wait", "moisturise"] as const).map((step, index) => (
              <li key={step} className="flex gap-3 py-4 sm:gap-4">
                <span aria-hidden="true" className="wp-serum-step flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white">{index + 1}</span>
                <p className="pt-0.5 text-base leading-7">{t(`steps.${step}`)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="actives-title" className="wp-serum-panel p-5 sm:p-8">
          <h2 id="actives-title" className={heading}>{t("activesTitle")}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {actives.map(({key, icon: Icon, orb}) => (
              <article key={key} className="rounded-2xl border border-accent/50 bg-background/70 p-4 sm:p-5">
                <div className="flex items-center gap-4 md:flex-col md:items-start">
                  <div aria-hidden="true" className={`wp-serum-orb ${orb}`}><Icon size={30} strokeWidth={1.3}/></div>
                  <h3 className="font-display text-xl font-semibold leading-snug text-primary">{t(`actives.${key}.name`)}</h3>
                </div>
                <p className="mt-4 text-[0.9375rem] leading-7 text-muted">{t(`actives.${key}.body`)}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="together-title" className="wp-serum-together rounded-3xl border border-primary/10 p-6 text-white sm:p-9">
          <h2 id="together-title" className="wp-serum-heading font-display text-2xl font-semibold leading-tight text-white sm:text-3xl">{t("togetherTitle")}</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/85">{t("togetherBody")}</p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-7 marker:text-accent">
            {(["copper", "ectoin", "hyaluronic"] as const).map((active) => <li key={active}>{t(`roles.${active}`)}</li>)}
          </ul>
        </section>

        <div className="grid gap-5 sm:gap-7 md:grid-cols-2">
          <section aria-labelledby="hands-title" className="wp-serum-panel p-5 sm:p-8 md:col-span-2">
            <Hand aria-hidden="true" className="wp-serum-copper mb-4" size={24} strokeWidth={1.5}/>
            <h2 id="hands-title" className={heading}>{t("handsTitle")}</h2>
            <p className="mt-4 text-base leading-7 text-muted">{t("handsBody")}</p>
          </section>
          <section aria-labelledby="ingredients-title" className="wp-serum-panel p-5 sm:p-8 md:col-span-2">
            <h2 id="ingredients-title" className={heading}>{t("ingredientsTitle")}</h2>
            <p className="mt-4 break-words text-base leading-7">{t("ingredients")}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{t("preservative")}</p>
          </section>
          <section aria-labelledby="storage-title" className="wp-serum-panel p-5 sm:p-8">
            <SunDim aria-hidden="true" className="wp-serum-copper mb-4" size={24} strokeWidth={1.5}/>
            <h2 id="storage-title" className={heading}>{t("storageTitle")}</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-7 text-muted marker:text-primary">
              {(["closed", "cool", "sunlight"] as const).map((note) => <li key={note}>{t(`storage.${note}`)}</li>)}
            </ul>
          </section>
          <section aria-labelledby="notes-title" className="wp-serum-panel p-5 sm:p-8">
            <ShieldCheck aria-hidden="true" className="wp-serum-copper mb-4" size={24} strokeWidth={1.5}/>
            <h2 id="notes-title" className={heading}>{t("notesTitle")}</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-7 text-muted marker:text-primary">
              {(["external", "eyes", "skin"] as const).map((note) => <li key={note}>{t(`notes.${note}`)}</li>)}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
