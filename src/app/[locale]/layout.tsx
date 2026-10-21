import type {Metadata} from "next";
import {Suspense} from "react";
import {hasLocale, NextIntlClientProvider} from "next-intl";
import {getMessages, getTranslations, setRequestLocale} from "next-intl/server";
import {notFound} from "next/navigation";
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "../globals.css";
import {SiteShell} from "@/components/site-shell";
import {publicInvitationOrigin} from "@/features/invitations/sharing";
import {routing} from "@/i18n/routing";
export function generateStaticParams() { return routing.locales.map((locale) => ({locale})); }

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "metadata"});
  const origin = publicInvitationOrigin(process.env.PUBLIC_APP_URL || process.env.BETTER_AUTH_URL) ?? "https://weightpilot.uk";
  const image = `/${locale}/opengraph-image`;
  return {
    metadataBase: new URL(origin),
    title: {default: t("title"), template: `%s · ${t("title")}`},
    description: t("description"),
    alternates: {canonical: `/${locale}`, languages: {en: "/en", es: "/es"}},
    openGraph: {
      type: "website", siteName: "WeightPilot", locale: locale === "es" ? "es_ES" : "en_GB",
      url: `/${locale}`, title: t("title"), description: t("description"),
      images: [{url: image, width: 1200, height: 630, alt: t("socialAlt")}],
    },
    twitter: {card: "summary_large_image", title: t("title"), description: t("description"), images: [image]},
  };
}

export default async function LocaleLayout({children, params}: {children: React.ReactNode; params: Promise<{locale: string}>}) {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  return <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning><body><NextIntlClientProvider messages={messages}><a href="#main-content" className="fixed left-3 top-3 z-50 -translate-y-20 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0">{messages.common.skipToContent}</a><Suspense fallback={<main className="min-h-[70vh] flex-1 px-4 py-10" aria-busy="true"><div className="soft-pulse mx-auto h-44 max-w-4xl rounded-[1.5rem] bg-mist-blue"/></main>}><SiteShell>{children}</SiteShell></Suspense></NextIntlClientProvider></body></html>;
}
