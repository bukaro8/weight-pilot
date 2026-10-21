import "server-only";

import {and, count, desc, eq, isNull, ne} from "drizzle-orm";
import {getDb} from "@/db";
import {messageConversation, privateMessage, user} from "@/db/schema";
import {canAccessAdmin, canAccessPrivateServices} from "@/features/auth/policy";
import {publicInvitationOrigin} from "@/features/invitations/sharing";
import {sendPrivateMessageNotification} from "@/features/messages/email";
import type {AdminConversationSummary, MessageItem} from "@/features/messages/types";
import type {PrivateMessageInput} from "@/features/messages/validation";

export type MessageActor = {id: string; role: "USER" | "ADMIN"; status: "ACTIVE" | "INACTIVE"; emailVerified: boolean};
export class MessagePermissionError extends Error { constructor() { super("MESSAGE_ACCESS_DENIED"); } }
export class MessageConversationNotFoundError extends Error { constructor() { super("MESSAGE_CONVERSATION_NOT_FOUND"); } }
export class MessageIdempotencyConflictError extends Error { constructor() { super("MESSAGE_IDEMPOTENCY_CONFLICT"); } }

function mapMessage(record: typeof privateMessage.$inferSelect, actorId: string): MessageItem {
  return {id: record.id, body: record.body, createdAt: record.createdAt.toISOString(), readAt: record.readAt?.toISOString() ?? null, senderRole: record.senderRole, isMine: record.senderId === actorId};
}

async function ensureMemberConversation(memberId: string) {
  const db = getDb();
  await db.insert(messageConversation).values({memberId}).onConflictDoNothing({target: messageConversation.memberId});
  const [record] = await db.select().from(messageConversation).where(eq(messageConversation.memberId, memberId)).limit(1);
  if (!record) throw new MessageConversationNotFoundError();
  return record;
}

export async function getMemberConversation(memberId: string) {
  const conversation = await ensureMemberConversation(memberId);
  const [records, [unread]] = await Promise.all([
    getDb().select().from(privateMessage).where(eq(privateMessage.conversationId, conversation.id)).orderBy(privateMessage.createdAt, privateMessage.id),
    getDb().select({count: count()}).from(privateMessage).where(and(eq(privateMessage.conversationId, conversation.id), ne(privateMessage.senderId, memberId), isNull(privateMessage.readAt))),
  ]);
  return {conversationId: conversation.id, updatedAt: conversation.updatedAt.toISOString(), messages: records.map((record) => mapMessage(record, memberId)), unreadCount: unread.count};
}

export async function markMemberConversationRead(memberId: string) {
  const [conversation] = await getDb().select({id: messageConversation.id}).from(messageConversation).where(eq(messageConversation.memberId, memberId)).limit(1);
  if (!conversation) return;
  await getDb().update(privateMessage).set({readAt: new Date()}).where(and(eq(privateMessage.conversationId, conversation.id), ne(privateMessage.senderId, memberId), isNull(privateMessage.readAt)));
}

export async function countMemberUnreadMessages(memberId: string) {
  const [result] = await getDb().select({count: count()}).from(privateMessage)
    .innerJoin(messageConversation, eq(privateMessage.conversationId, messageConversation.id))
    .where(and(eq(messageConversation.memberId, memberId), ne(privateMessage.senderId, memberId), isNull(privateMessage.readAt)));
  return result.count;
}

export async function countAdminUnreadMessages(adminId: string) {
  const [result] = await getDb().select({count: count()}).from(privateMessage)
    .innerJoin(messageConversation, eq(privateMessage.conversationId, messageConversation.id))
    .where(and(ne(privateMessage.senderId, adminId), isNull(privateMessage.readAt)));
  return result.count;
}

export async function listAdminConversations(adminId: string): Promise<AdminConversationSummary[]> {
  const conversations = await getDb().select({
    id: messageConversation.id, memberId: messageConversation.memberId, memberName: user.name, memberEmail: user.email,
    memberStatus: user.status, language: user.preferredLanguage, updatedAt: messageConversation.updatedAt,
  }).from(messageConversation).innerJoin(user, eq(messageConversation.memberId, user.id)).orderBy(desc(messageConversation.updatedAt));

  return Promise.all(conversations.map(async (conversation) => {
    const [[last], [unread]] = await Promise.all([
      getDb().select({body: privateMessage.body}).from(privateMessage).where(eq(privateMessage.conversationId, conversation.id)).orderBy(desc(privateMessage.createdAt), desc(privateMessage.id)).limit(1),
      getDb().select({count: count()}).from(privateMessage).where(and(eq(privateMessage.conversationId, conversation.id), ne(privateMessage.senderId, adminId), isNull(privateMessage.readAt))),
    ]);
    return {...conversation, updatedAt: conversation.updatedAt.toISOString(), lastMessage: last?.body ?? null, unreadCount: unread.count};
  }));
}

export async function getAdminConversation(conversationId: string, actorId: string) {
  const [conversation] = await getDb().select({
    id: messageConversation.id, memberId: messageConversation.memberId, memberName: user.name,
    memberEmail: user.email, memberStatus: user.status, language: user.preferredLanguage,
    updatedAt: messageConversation.updatedAt,
  }).from(messageConversation).innerJoin(user, eq(messageConversation.memberId, user.id)).where(eq(messageConversation.id, conversationId)).limit(1);
  if (!conversation) return null;
  const records = await getDb().select().from(privateMessage).where(eq(privateMessage.conversationId, conversationId)).orderBy(privateMessage.createdAt, privateMessage.id);
  const [unread] = await getDb().select({count: count()}).from(privateMessage).where(and(eq(privateMessage.conversationId, conversationId), ne(privateMessage.senderId, actorId), isNull(privateMessage.readAt)));
  return {...conversation, updatedAt: conversation.updatedAt.toISOString(), messages: records.map((record) => mapMessage(record, actorId)), unreadCount: unread.count};
}

export async function markAdminConversationRead(conversationId: string, adminId: string) {
  await getDb().update(privateMessage).set({readAt: new Date()}).where(and(eq(privateMessage.conversationId, conversationId), ne(privateMessage.senderId, adminId), isNull(privateMessage.readAt)));
}

async function sendMessage(actor: MessageActor, requestedConversationId: string | null, input: PrivateMessageInput) {
  const db = getDb();
  const inserted = await db.transaction(async (tx) => {
    const [freshActor] = await tx.select().from(user).where(eq(user.id, actor.id)).limit(1).for("update");
    if (!freshActor || !canAccessPrivateServices(freshActor) || (actor.role === "ADMIN" ? !canAccessAdmin(freshActor) : freshActor.role !== "USER")) throw new MessagePermissionError();
    if (!requestedConversationId && actor.role === "USER") await tx.insert(messageConversation).values({memberId: actor.id}).onConflictDoNothing({target: messageConversation.memberId});
    if (!requestedConversationId && actor.role !== "USER") throw new MessageConversationNotFoundError();
    const conversationId = requestedConversationId ?? (await tx.select({id: messageConversation.id}).from(messageConversation).where(eq(messageConversation.memberId, actor.id)).limit(1))[0]?.id;
    if (!conversationId) throw new MessageConversationNotFoundError();
    const [conversation] = await tx.select().from(messageConversation).where(eq(messageConversation.id, conversationId)).limit(1).for("update");
    if (!conversation || (actor.role === "USER" && conversation.memberId !== actor.id)) throw new MessageConversationNotFoundError();
    const [record] = await tx.insert(privateMessage).values({
      conversationId, senderId: actor.id, senderRole: actor.role, clientMessageId: input.clientMessageId, body: input.body,
    }).onConflictDoNothing().returning();
    if (!record) {
      const [existing] = await tx.select().from(privateMessage).where(and(eq(privateMessage.clientMessageId, input.clientMessageId), eq(privateMessage.conversationId, conversationId), eq(privateMessage.senderId, actor.id), eq(privateMessage.body, input.body))).limit(1);
      if (!existing) throw new MessageIdempotencyConflictError();
      return {record: existing, created: false, memberId: conversation.memberId, conversationId: conversation.id};
    }
    await tx.update(messageConversation).set({updatedAt: record.createdAt}).where(eq(messageConversation.id, conversation.id));
    return {record, created: true, memberId: conversation.memberId, conversationId: conversation.id};
  });
  return inserted;
}

async function notifyRecipient(messageId: string, recipient: string, language: "en" | "es", localePath: string) {
  const origin = publicInvitationOrigin(process.env.PUBLIC_APP_URL || process.env.BETTER_AUTH_URL);
  if (!origin) return;
  const url = new URL(localePath, origin).toString();
  await sendPrivateMessageNotification({messageId, recipient, language, url});
}

export async function sendMemberMessage(actor: MessageActor, input: PrivateMessageInput) {
  const result = await sendMessage(actor, null, input);
  if (result.created) {
    const [admin] = await getDb().select({id: user.id, email: user.email, language: user.preferredLanguage})
      .from(user).where(and(eq(user.role, "ADMIN"), eq(user.status, "ACTIVE"), eq(user.emailVerified, true))).limit(1);
    if (admin) await notifyRecipient(result.record.id, admin.email, admin.language, `/${admin.language}/admin/messages/${result.conversationId}`);
  }
  return {conversationId: result.conversationId, message: mapMessage(result.record, actor.id), created: result.created};
}

export async function sendAdminMessage(actor: MessageActor, conversationId: string, input: PrivateMessageInput) {
  const result = await sendMessage(actor, conversationId, input);
  if (result.created) {
    const [member] = await getDb().select({email: user.email, language: user.preferredLanguage, status: user.status, emailVerified: user.emailVerified})
      .from(user).where(eq(user.id, result.memberId)).limit(1);
    if (member?.status === "ACTIVE" && member.emailVerified) await notifyRecipient(result.record.id, member.email, member.language, `/${member.language}/messages`);
  }
  return {conversationId, message: mapMessage(result.record, actor.id), created: result.created};
}

export async function countUnreadForAdminSidebar(adminId: string) { return countAdminUnreadMessages(adminId); }

