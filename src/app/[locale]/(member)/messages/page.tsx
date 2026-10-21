import {ConversationChat} from "@/components/messages/conversation-chat";
import {getMemberConversation} from "@/features/messages/server";
import {redirect} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";
import {requireMember} from "@/lib/authorization";
import {getTranslations, setRequestLocale} from "next-intl/server";

export default async function MessagesPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const member = await requireMember(locale, "/messages");
  if (member.role === "ADMIN") redirect({href: "/admin/messages", locale});
  const [initial, t] = await Promise.all([getMemberConversation(member.id), getTranslations("messages")]);
  return <ConversationChat locale={locale} apiPath="/api/messages" readPath="/api/messages/read" initialMessages={initial.messages} initialUnreadCount={initial.unreadCount} title={t("title")} description={t("description")}/>;
}
