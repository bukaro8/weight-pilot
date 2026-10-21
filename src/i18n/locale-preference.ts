import type {Locale} from "@/i18n/routing";

export function resolveInitialLocale({
  manualLocale,
  memberLocale,
  acceptLanguage,
}: {
  manualLocale?: string;
  memberLocale?: string;
  acceptLanguage?: string;
}): Locale {
  if (manualLocale === "en" || manualLocale === "es") return manualLocale;
  if (memberLocale === "en" || memberLocale === "es") return memberLocale;

  const firstBrowserLanguage = acceptLanguage?.split(",", 1)[0]?.split(";", 1)[0]?.trim().toLowerCase();
  return firstBrowserLanguage?.split("-", 1)[0] === "es" ? "es" : "en";
}

export function localizedRootPath(locale: Locale, searchParams: Record<string, string | string[] | undefined> | URLSearchParams) {
  const query = new URLSearchParams();
  if (searchParams instanceof URLSearchParams) {
    searchParams.forEach((value, key) => query.append(key, value));
  } else {
    for (const [key, value] of Object.entries(searchParams)) {
      if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
      else if (value !== undefined) query.set(key, value);
    }
  }
  const serialized = query.toString();
  return `/${locale}${serialized ? `?${serialized}` : ""}`;
}
