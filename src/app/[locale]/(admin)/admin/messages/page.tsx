import {AdminMessagesInbox} from "@/components/admin/admin-messages-inbox";
import {listAdminConversations} from "@/features/messages/server";
import type {Locale} from "@/i18n/routing";
import {requireAdmin} from "@/lib/authorization";
import {setRequestLocale} from "next-intl/server";

export default async function AdminMessagesPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const admin = await requireAdmin(locale, "/admin/messages");
  const conversations = await listAdminConversations(admin.id);
  return <AdminMessagesInbox conversations={conversations} locale={locale}/>;
}
