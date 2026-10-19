import {PlaceholderPage} from "@/components/placeholder-page";
import {setRequestLocale} from "next-intl/server";
import {requireMember} from "@/lib/authorization";
import type {Locale} from "@/i18n/routing";

export default async function MessagesPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  await requireMember(locale, "/messages");
  return <PlaceholderPage namespace="messages"/>;
}
