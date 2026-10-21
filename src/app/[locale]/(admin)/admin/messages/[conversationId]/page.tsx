import {notFound} from "next/navigation";
import {ConversationChat} from "@/components/messages/conversation-chat";
import {getAdminConversation} from "@/features/messages/server";
import {conversationIdSchema} from "@/features/messages/validation";
import type {Locale} from "@/i18n/routing";
import {Link} from "@/i18n/navigation";
import {requireAdmin} from "@/lib/authorization";
import {getTranslations, setRequestLocale} from "next-intl/server";

export default async function AdminMessageConversationPage({params}: {params: Promise<{locale: Locale; conversationId: string}>}) {
  const {locale, conversationId} = await params;
  setRequestLocale(locale);
  const admin = await requireAdmin(locale, `/admin/messages/${conversationId}`);
  if (!conversationIdSchema.safeParse(conversationId).success) notFound();
  const [conversation, t] = await Promise.all([getAdminConversation(conversationId, admin.id), getTranslations("adminMessages")]);
  if (!conversation) notFound();
  return <div className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-7 lg:px-8"><Link href="/admin/messages" className="mb-4 inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-primary hover:bg-mist-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">← {t("back")}</Link><ConversationChat locale={locale} apiPath={`/api/admin/messages/${conversationId}`} readPath={`/api/admin/messages/${conversationId}/read`} initialMessages={conversation.messages} initialUnreadCount={conversation.unreadCount} title={conversation.memberName} description={t("conversationDescription")} recipient={conversation.memberEmail}/></div>;
}
