import {Suspense} from "react";
import {AdminShell} from "@/components/admin/admin-shell";
import {hasLocale} from "next-intl";
import {notFound} from "next/navigation";
import {routing} from "@/i18n/routing";
import {requireAdmin} from "@/lib/authorization";
import {countAdminUnreadMessages} from "@/features/messages/server";

export default async function AdminLayout({children, params}: {children: React.ReactNode; params: Promise<{locale: string}>}) {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const administrator = await requireAdmin(locale);
  const unreadMessages = await countAdminUnreadMessages(administrator.id);
  return <Suspense fallback={<div className="min-h-screen bg-background p-6" aria-busy="true"><div className="mx-auto mt-10 h-40 max-w-3xl animate-pulse rounded-3xl bg-mist-blue motion-reduce:animate-none"/></div>}><AdminShell administratorName={administrator.name} unreadMessages={unreadMessages}>{children}</AdminShell></Suspense>;
}
