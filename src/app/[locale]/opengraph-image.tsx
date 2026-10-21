import {getTranslations} from "next-intl/server";
import {socialImage} from "@/lib/brand-images";
import {routing} from "@/i18n/routing";

export const alt = "WeightPilot — personalised weight-management guidance";
export const size = {width: 1200, height: 630};
export const contentType = "image/png";

export default async function OpenGraphImage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const language = routing.locales.includes(locale as "en" | "es") ? locale : "en";
  const t = await getTranslations({locale: language, namespace: "metadata"});
  return socialImage(t("socialDescription"));
}
