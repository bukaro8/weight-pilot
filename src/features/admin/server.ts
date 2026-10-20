import "server-only";

import {and, asc, count, desc, eq, gt} from "drizzle-orm";
import {alias} from "drizzle-orm/pg-core";

import {getDb} from "@/db";
import {invitation, questionnaire, questionnaireReviewRequest, referral, session, user} from "@/db/schema";
import {buildAdminDashboardData} from "@/features/admin/analytics";
import type {AdminDashboardData, AdminReviewSummary, AdminUserDetail, AdminUserDirectoryEntry} from "@/features/admin/types";

export async function listAdminReviewSummaries(): Promise<AdminReviewSummary[]> {
  const records = await getDb().select({
    id: questionnaireReviewRequest.id,
    memberId: user.id,
    memberName: user.name,
    memberEmail: user.email,
    language: questionnaireReviewRequest.reportLanguage,
    status: questionnaireReviewRequest.status,
    requestedAt: questionnaireReviewRequest.requestedAt,
    updatedAt: questionnaireReviewRequest.updatedAt,
  }).from(questionnaireReviewRequest)
    .innerJoin(user, eq(questionnaireReviewRequest.requestedByUserId, user.id))
    .orderBy(desc(questionnaireReviewRequest.requestedAt));

  return records.map((record) => ({
    ...record,
    requestedAt: record.requestedAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }));
}

export async function listAdminUsers(): Promise<AdminUserDirectoryEntry[]> {
  const referrer = alias(user, "directory_referrer");
  const [members, registrationReferrals, reviews] = await Promise.all([
    getDb().select({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      status: user.status,
      emailVerified: user.emailVerified,
      preferredLanguage: user.preferredLanguage,
    }).from(user).where(eq(user.role, "USER")).orderBy(asc(user.name), asc(user.email)),
    getDb().select({
      referredUserId: referral.referredUserId,
      referrerName: referrer.name,
      referrerEmail: referrer.email,
    }).from(referral)
      .innerJoin(referrer, eq(referral.referrerUserId, referrer.id))
      .where(eq(referral.type, "REGISTRATION"))
      .orderBy(asc(referral.createdAt)),
    getDb().select({
      id: questionnaireReviewRequest.id,
      userId: questionnaireReviewRequest.requestedByUserId,
      status: questionnaireReviewRequest.status,
      requestedAt: questionnaireReviewRequest.requestedAt,
    }).from(questionnaireReviewRequest).orderBy(desc(questionnaireReviewRequest.requestedAt)),
  ]);

  const referralByUser = new Map(registrationReferrals.map((record) => [record.referredUserId, {name: record.referrerName, email: record.referrerEmail}]));
  const reviewsByUser = new Map<string, AdminUserDirectoryEntry["reviewRequests"]>();
  for (const review of reviews) {
    const existing = reviewsByUser.get(review.userId) ?? [];
    existing.push({id: review.id, status: review.status, requestedAt: review.requestedAt.toISOString()});
    reviewsByUser.set(review.userId, existing);
  }

  return members.map((member) => ({
    ...member,
    createdAt: member.createdAt.toISOString(),
    referralSource: referralByUser.get(member.id) ?? null,
    reviewRequests: reviewsByUser.get(member.id) ?? [],
  }));
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [members, reviews] = await Promise.all([listAdminUsers(), listAdminReviewSummaries()]);
  return buildAdminDashboardData(members, reviews);
}

export async function getAdminUserDetail(id: string): Promise<AdminUserDetail | null> {
  const [entry, [sessions], [questionnaires], [invitations]] = await Promise.all([
    listAdminUsers().then((users) => users.find((candidate) => candidate.id === id) ?? null),
    getDb().select({count: count()}).from(session).where(and(eq(session.userId, id), gt(session.expiresAt, new Date()))),
    getDb().select({count: count()}).from(questionnaire).where(eq(questionnaire.userId, id)),
    getDb().select({count: count()}).from(invitation).where(eq(invitation.creatorId, id)),
  ]);
  if (!entry) return null;
  return {...entry, activeSessionCount: sessions.count, questionnaireCount: questionnaires.count, invitationCount: invitations.count};
}
