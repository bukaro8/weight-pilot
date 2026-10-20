import {AdminShell} from "@/components/admin/admin-shell";
import {hasLocale} from "next-intl";
import {notFound} from "next/navigation";
import {routing} from "@/i18n/routing";
import {requireAdmin} from "@/lib/authorization";

export default async function AdminLayout({children, params}: {children: React.ReactNode; params: Promise<{locale: string}>}) {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const administrator = await requireAdmin(locale);
  return <AdminShell administratorName={administrator.name}>{children}</AdminShell>;
}
