import {PlaceholderPage} from "@/components/placeholder-page";
import {setRequestLocale} from "next-intl/server";
import {requireMember} from "@/lib/authorization";
import type {Locale} from "@/i18n/routing";

export default async function ConsultationsPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  await requireMember(locale, "/consultations");
  return <PlaceholderPage namespace="consultations"/>;
}
