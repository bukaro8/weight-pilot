import "server-only";

import {and, desc, eq, gte, inArray, sql} from "drizzle-orm";

import {getDb} from "@/db";
import {memberFollowUp, memberFollowUpPreference, questionnaire, treatmentAccessRequest, user} from "@/db/schema";
import {canAccessAdmin} from "@/features/auth/policy";
import {publicInvitationOrigin} from "@/features/invitations/sharing";
import {submitFollowUpEmail} from "./email";
import {followUpEligible, needsRecentReminderConfirmation} from "./policy";
import type {FollowUpCandidate, FollowUpCategory, FollowUpHistoryItem} from "./types";
import type {z} from "zod";
import type {followUpSendSchema} from "./validation";

type SendInput = z.infer<typeof followUpSendSchema>;
type SendResult = {kind: "ACCEPTED" | "FAILED" | "UNCERTAIN" | "ALREADY_PROCESSED" | "RECENT_CONFIRMATION_REQUIRED" | "RECENT_DUPLICATE" | "RATE_LIMITED" | "INELIGIBLE" | "OPTED_OUT" | "NOT_CONFIGURED"; status?: string};

function serializeHistory(record: typeof memberFollowUp.$inferSelect): FollowUpHistoryItem {
  return {
    id: record.id, category: record.category, subject: record.subject, language: record.language,
    status: record.sendStatus, createdAt: record.createdAt.toISOString(),
    acceptedAt: record.acceptedAt?.toISOString() ?? null,
    deliveredAt: record.deliveredAt?.toISOString() ?? null,
  };
}

export async function listMemberFollowUpHistory(memberId: string) {
  const records = await getDb().select().from(memberFollowUp).where(eq(memberFollowUp.memberId, memberId))
    .orderBy(desc(memberFollowUp.createdAt)).limit(30);
  return records.map(serializeHistory);
}

export async function listAdminFollowUpCandidates(): Promise<FollowUpCandidate[]> {
  const database = getDb();
  const [members, drafts, submitted, approved, preferences, reminders] = await Promise.all([
    database.select({id: user.id, name: user.name, email: user.email, language: user.preferredLanguage})
      .from(user).where(and(eq(user.role, "USER"), eq(user.status, "ACTIVE"), eq(user.emailVerified, true))),
    database.select({userId: questionnaire.userId}).from(questionnaire).where(eq(questionnaire.status, "DRAFT")),
    database.select({userId: questionnaire.userId}).from(questionnaire).where(eq(questionnaire.status, "SUBMITTED")),
    database.select({memberId: treatmentAccessRequest.memberId}).from(treatmentAccessRequest)
      .where(eq(treatmentAccessRequest.status, "APPROVED_FOR_NEXT_STEPS")),
    database.select().from(memberFollowUpPreference),
    database.select({memberId: memberFollowUp.memberId, category: memberFollowUp.category, status: memberFollowUp.sendStatus, acceptedAt: memberFollowUp.acceptedAt})
      .from(memberFollowUp).where(inArray(memberFollowUp.sendStatus, ["ACCEPTED", "DELIVERED"])),
  ]);
  const draftIds = new Set(drafts.map((item) => item.userId));
  const submittedIds = new Set(submitted.map((item) => item.userId));
  const approvedIds = new Set(approved.map((item) => item.memberId));
  const optedOut = new Set(preferences.filter((item) => item.doNotRemind).map((item) => item.memberId));
  const now = new Date();
  return members.flatMap((member) => (["INCOMPLETE_ASSESSMENT", "TREATMENT_FOLLOW_UP"] as const).flatMap((category) => {
    const hasDraft = draftIds.has(member.id);
    const hasSubmittedAssessment = submittedIds.has(member.id);
    const hasApprovedRequest = approvedIds.has(member.id);
    if (!followUpEligible({role: "USER", status: "ACTIVE", emailVerified: true, category, hasDraft, hasSubmittedAssessment, hasApprovedRequest, doNotRemind: false})) return [];
    const history = reminders.filter((item) => item.memberId === member.id && item.category === category && item.acceptedAt);
    const lastReminderAt = history.reduce<Date | null>((latest, item) => item.acceptedAt && (!latest || item.acceptedAt > latest) ? item.acceptedAt : latest, null);
    return [{
      memberId: member.id, name: member.name, email: member.email, language: member.language,
      category, relatedStatus: category === "INCOMPLETE_ASSESSMENT" ? "DRAFT" : "APPROVED_FOR_NEXT_STEPS",
      lastReminderAt: lastReminderAt?.toISOString() ?? null,
      reminderCount: history.length,
      recentReminder: needsRecentReminderConfirmation(lastReminderAt, now),
      doNotRemind: optedOut.has(member.id),
    }];
  }));
}

async function checkEligibility(transaction: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0], memberId: string, category: FollowUpCategory) {
  const [draft] = category === "INCOMPLETE_ASSESSMENT"
    ? await transaction.select({id: questionnaire.id}).from(questionnaire).where(and(eq(questionnaire.userId, memberId), eq(questionnaire.status, "DRAFT"))).limit(1)
    : [];
  const [submitted] = category === "INCOMPLETE_ASSESSMENT"
    ? await transaction.select({id: questionnaire.id}).from(questionnaire).where(and(eq(questionnaire.userId, memberId), eq(questionnaire.status, "SUBMITTED"))).limit(1)
    : [];
  const [approved] = category === "TREATMENT_FOLLOW_UP"
    ? await transaction.select({id: treatmentAccessRequest.id}).from(treatmentAccessRequest)
      .where(and(eq(treatmentAccessRequest.memberId, memberId), eq(treatmentAccessRequest.status, "APPROVED_FOR_NEXT_STEPS"))).limit(1)
    : [];
  return {hasDraft: Boolean(draft), hasSubmittedAssessment: Boolean(submitted), hasApprovedRequest: Boolean(approved)};
}

export async function sendManualFollowUp(adminId: string, input: SendInput): Promise<SendResult> {
  const origin = publicInvitationOrigin(process.env.PUBLIC_APP_URL);
  if (!origin || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return {kind: "NOT_CONFIGURED"};
  const database = getDb();
  const prepared = await database.transaction(async (transaction) => {
    const [admin] = await transaction.select({role: user.role, status: user.status, emailVerified: user.emailVerified})
      .from(user).where(eq(user.id, adminId)).limit(1);
    if (!admin || !canAccessAdmin(admin)) return {kind: "INELIGIBLE" as const};
    const [member] = await transaction.select({id: user.id, email: user.email, role: user.role, status: user.status, emailVerified: user.emailVerified})
      .from(user).where(eq(user.id, input.memberId)).limit(1).for("update");
    if (!member) return {kind: "INELIGIBLE" as const};

    const [existing] = await transaction.select({memberId: memberFollowUp.memberId, category: memberFollowUp.category, status: memberFollowUp.sendStatus})
      .from(memberFollowUp).where(eq(memberFollowUp.clientActionId, input.clientActionId)).limit(1);
    if (existing) return existing.memberId === member.id && existing.category === input.category
      ? {kind: "ALREADY_PROCESSED" as const, status: existing.status} : {kind: "INELIGIBLE" as const};

    const [preference] = await transaction.select({doNotRemind: memberFollowUpPreference.doNotRemind})
      .from(memberFollowUpPreference).where(eq(memberFollowUpPreference.memberId, member.id)).limit(1);
    if (preference?.doNotRemind) return {kind: "OPTED_OUT" as const};
    const state = await checkEligibility(transaction, member.id, input.category);
    if (!followUpEligible({...member, category: input.category, doNotRemind: false, ...state})) return {kind: "INELIGIBLE" as const};

    const now = new Date();
    const lastSevenDays = new Date(now.getTime() - 7 * 86400000);
    const lastFiveMinutes = new Date(now.getTime() - 5 * 60000);
    const [recent] = await transaction.select({acceptedAt: memberFollowUp.acceptedAt})
      .from(memberFollowUp).where(and(eq(memberFollowUp.memberId, member.id), eq(memberFollowUp.category, input.category),
        inArray(memberFollowUp.sendStatus, ["ACCEPTED", "DELIVERED"]), gte(memberFollowUp.acceptedAt, lastSevenDays)))
      .orderBy(desc(memberFollowUp.acceptedAt)).limit(1);
    if (recent?.acceptedAt && recent.acceptedAt >= lastFiveMinutes) return {kind: "RECENT_DUPLICATE" as const};
    if (recent?.acceptedAt && !input.confirmRecent) return {kind: "RECENT_CONFIRMATION_REQUIRED" as const};
    const [unsettled] = await transaction.select({id: memberFollowUp.id}).from(memberFollowUp)
      .where(and(eq(memberFollowUp.memberId, member.id), eq(memberFollowUp.category, input.category),
        inArray(memberFollowUp.sendStatus, ["SENDING", "UNCERTAIN"]))).limit(1);
    if (unsettled) return {kind: "RECENT_DUPLICATE" as const};
    const [sentToday] = await transaction.select({total: sql<number>`count(*)::int`}).from(memberFollowUp)
      .where(and(eq(memberFollowUp.adminId, adminId), gte(memberFollowUp.createdAt, new Date(now.getTime() - 86400000)),
        inArray(memberFollowUp.sendStatus, ["SENDING", "ACCEPTED", "DELIVERED", "UNCERTAIN"])));
    if ((sentToday?.total ?? 0) >= 40) return {kind: "RATE_LIMITED" as const};

    const [created] = await transaction.insert(memberFollowUp).values({
      clientActionId: input.clientActionId, memberId: member.id, adminId, category: input.category,
      subject: input.subject, language: input.language,
    }).returning({id: memberFollowUp.id});
    return {kind: "READY" as const, id: created.id, recipient: member.email};
  });
  if (prepared.kind !== "READY") return prepared;

  const messagesUrl = new URL(`/${input.language}/messages`, origin).toString();
  const actionUrl = input.category === "INCOMPLETE_ASSESSMENT"
    ? new URL(`/${input.language}/consultations`, origin).toString() : messagesUrl;
  const result = await submitFollowUpEmail({
    id: prepared.id, recipient: prepared.recipient, category: input.category, language: input.language,
    subject: input.subject, message: input.message, actionUrl, messagesUrl,
  });
  try {
    if (result.kind === "ACCEPTED") {
      await database.update(memberFollowUp).set({sendStatus: "ACCEPTED", providerMessageId: result.providerMessageId, acceptedAt: new Date(), failureCode: null})
        .where(and(eq(memberFollowUp.id, prepared.id), eq(memberFollowUp.sendStatus, "SENDING")));
      return {kind: "ACCEPTED"};
    }
    if (result.kind === "REJECTED" || result.kind === "NOT_CONFIGURED") {
      await database.update(memberFollowUp).set({sendStatus: "FAILED", failedAt: new Date(), failureCode: result.kind})
        .where(and(eq(memberFollowUp.id, prepared.id), eq(memberFollowUp.sendStatus, "SENDING")));
      return {kind: "FAILED"};
    }
    await database.update(memberFollowUp).set({sendStatus: "UNCERTAIN", failureCode: "PROVIDER_RESPONSE_UNCERTAIN"})
      .where(and(eq(memberFollowUp.id, prepared.id), eq(memberFollowUp.sendStatus, "SENDING")));
  } catch { /* The persistent SENDING record blocks an unsafe retry. */ }
  return {kind: "UNCERTAIN"};
}

export async function updateFollowUpOptOut(adminId: string, memberId: string, doNotRemind: boolean) {
  return getDb().transaction(async (transaction) => {
    const [admin] = await transaction.select({role: user.role, status: user.status, emailVerified: user.emailVerified})
      .from(user).where(eq(user.id, adminId)).limit(1);
    if (!admin || !canAccessAdmin(admin)) return false;
    const [member] = await transaction.select({id: user.id}).from(user)
      .where(and(eq(user.id, memberId), eq(user.role, "USER"))).limit(1).for("update");
    if (!member) return false;
    await transaction.insert(memberFollowUpPreference).values({memberId, doNotRemind, updatedByAdminId: adminId})
      .onConflictDoUpdate({target: memberFollowUpPreference.memberId, set: {doNotRemind, updatedAt: new Date(), updatedByAdminId: adminId}});
    return true;
  });
}

export async function applyFollowUpDeliveryEvent(input: {type: string; providerMessageId: string}) {
  const [record] = await getDb().select({id: memberFollowUp.id, status: memberFollowUp.sendStatus})
    .from(memberFollowUp).where(eq(memberFollowUp.providerMessageId, input.providerMessageId)).limit(1);
  if (!record || record.status === "DELIVERED") return false;
  if (input.type === "email.delivered") {
    await getDb().update(memberFollowUp).set({sendStatus: "DELIVERED", deliveredAt: new Date(), failedAt: null, failureCode: null})
      .where(eq(memberFollowUp.id, record.id));
    return true;
  }
  if (["email.failed", "email.bounced", "email.suppressed", "email.complained"].includes(input.type)) {
    await getDb().update(memberFollowUp).set({sendStatus: "FAILED", failedAt: new Date(), failureCode: "PROVIDER_DELIVERY_FAILED"})
      .where(eq(memberFollowUp.id, record.id));
    return true;
  }
  return false;
}
