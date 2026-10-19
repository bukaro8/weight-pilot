import type {Metadata} from "next";
import {hasLocale, NextIntlClientProvider} from "next-intl";
import {getMessages, getTranslations, setRequestLocale} from "next-intl/server";
import {notFound} from "next/navigation";
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "../globals.css";
import {routing} from "@/i18n/routing";
import {SiteHeader} from "@/components/site-header";
import {SiteFooter} from "@/components/site-footer";
export function generateStaticParams() { return routing.locales.map((locale) => ({locale})); }

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "metadata"});
  return {title: {default: t("title"), template: `%s · ${t("title")}`}, description: t("description")};
}

export default async function LocaleLayout({children, params}: {children: React.ReactNode; params: Promise<{locale: string}>}) {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  return <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning><body><NextIntlClientProvider messages={messages}><div className="flex min-h-screen flex-col"><a href="#main-content" className="fixed left-3 top-3 z-50 -translate-y-20 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0">{messages.common.skipToContent}</a><SiteHeader/>{children}<SiteFooter/></div></NextIntlClientProvider></body></html>;
}
