import "server-only";

import {randomBytes, randomUUID} from "node:crypto";

import {hashPassword, symmetricDecrypt, symmetricEncrypt, verifyPassword} from "better-auth/crypto";
import {and, desc, eq, gt, isNull, sql} from "drizzle-orm";
import {alias} from "drizzle-orm/pg-core";

import {getDb} from "@/db";
import {account, invitation, referral, session, user} from "@/db/schema";
import {invitationCodeHash} from "@/features/invitations/security";
import type {InvitationReactivationInput, InvitationRegistrationInput} from "@/features/invitations/validation";

const invitationLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const buildOnlySecret = "weightpilot-build-only-secret-not-for-runtime";

export type InvitationStatus = "ACTIVE" | "USED" | "EXPIRED" | "REVOKED";

export class InvitationError extends Error {
  constructor(public readonly code: "INVITATION_UNAVAILABLE" | "REGISTRATION_FAILED" | "REACTIVATION_FAILED") {
    super(code);
  }
}

function encryptionSecret() {
  const secret = process.env.BETTER_AUTH_SECRET ?? (process.env.npm_lifecycle_event === "build" ? buildOnlySecret : undefined);
  if (!secret) throw new Error("BETTER_AUTH_SECRET is required");
  return secret;
}

export function getInvitationStatus(record: {redeemedAt: Date | null; revokedAt: Date | null; expiresAt: Date}): InvitationStatus {
  if (record.redeemedAt) return "USED";
  if (record.revokedAt) return "REVOKED";
  if (record.expiresAt.getTime() <= Date.now()) return "EXPIRED";
  return "ACTIVE";
}

async function decryptCode(ciphertext: string) {
  try {
    return await symmetricDecrypt({key: encryptionSecret(), data: ciphertext});
  } catch {
    return null;
  }
}

export async function createInvitation(creatorId: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = `WP_${randomBytes(24).toString("base64url")}`;
    const codeHash = invitationCodeHash(code);
    const codeCiphertext = await symmetricEncrypt({key: encryptionSecret(), data: code});
    const expiresAt = new Date(Date.now() + invitationLifetimeMs);
    try {
      const [created] = await getDb().insert(invitation).values({
        codeHash,
        codeCiphertext,
        codePreview: code.slice(-6),
        creatorId,
        expiresAt,
      }).returning();
      return {...created, code, status: "ACTIVE" as const};
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
  throw new Error("Unable to create invitation");
}

export async function listMemberInvitations(creatorId: string) {
  const records = await getDb().select({
    id: invitation.id,
    codeCiphertext: invitation.codeCiphertext,
    codePreview: invitation.codePreview,
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
    redeemedAt: invitation.redeemedAt,
    revokedAt: invitation.revokedAt,
    redemptionType: invitation.redemptionType,
  }).from(invitation)
    .where(eq(invitation.creatorId, creatorId)).orderBy(desc(invitation.createdAt));
  return Promise.all(records.map(async (record) => ({
    id: record.id,
    code: getInvitationStatus(record) === "ACTIVE" ? await decryptCode(record.codeCiphertext) : null,
    codePreview: record.codePreview,
    createdAt: record.createdAt.toISOString(),
    expiresAt: record.expiresAt.toISOString(),
    redeemedAt: record.redeemedAt?.toISOString() ?? null,
    revokedAt: record.revokedAt?.toISOString() ?? null,
    redemptionType: record.redemptionType,
    status: getInvitationStatus(record),
  })));
}

export async function revokeInvitation(invitationId: string, actor: {id: string; role: "USER" | "ADMIN"}) {
  const conditions = [
    eq(invitation.id, invitationId),
    isNull(invitation.redeemedAt),
    isNull(invitation.revokedAt),
  ];
  if (actor.role !== "ADMIN") conditions.push(eq(invitation.creatorId, actor.id));
  const [updated] = await getDb().update(invitation).set({revokedAt: new Date()})
    .where(and(...conditions)).returning({id: invitation.id});
  return Boolean(updated);
}

function invitationIsAvailable(record: typeof invitation.$inferSelect | undefined) {
  return Boolean(record && !record.redeemedAt && !record.revokedAt && record.expiresAt.getTime() > Date.now());
}

export async function registerWithInvitation(input: InvitationRegistrationInput) {
  const passwordHash = await hashPassword(input.password);
  const codeHash = invitationCodeHash(input.code);
  const userId = randomUUID();

  try {
    return await getDb().transaction(async (transaction) => {
      const [lockedInvitation] = await transaction.select().from(invitation)
        .where(eq(invitation.codeHash, codeHash)).limit(1).for("update");
      if (!invitationIsAvailable(lockedInvitation)) throw new InvitationError("INVITATION_UNAVAILABLE");

      const [existingUser] = await transaction.select({id: user.id}).from(user)
        .where(sql`lower(${user.email}) = ${input.email}`).limit(1);
      if (existingUser) throw new InvitationError("REGISTRATION_FAILED");

      await transaction.insert(user).values({
        id: userId,
        name: input.name,
        email: input.email,
        emailVerified: false,
        preferredLanguage: input.preferredLanguage,
        role: "USER",
        status: "ACTIVE",
      });
      await transaction.insert(account).values({
        id: randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
      });

      const redeemedAt = new Date();
      const [consumed] = await transaction.update(invitation).set({
        redeemedAt,
        redeemedByUserId: userId,
        redemptionType: "REGISTRATION",
      }).where(and(
        eq(invitation.id, lockedInvitation.id),
        isNull(invitation.redeemedAt),
        isNull(invitation.revokedAt),
        gt(invitation.expiresAt, redeemedAt),
      )).returning({id: invitation.id});
      if (!consumed) throw new InvitationError("INVITATION_UNAVAILABLE");
      await transaction.insert(referral).values({
        invitationId: lockedInvitation.id,
        referrerUserId: lockedInvitation.creatorId,
        referredUserId: userId,
        type: "REGISTRATION",
      });
      return {userId, email: input.email};
    });
  } catch (error) {
    if (error instanceof InvitationError) throw error;
    throw new InvitationError("REGISTRATION_FAILED");
  }
}

export async function reactivateWithInvitation(input: InvitationReactivationInput) {
  const [record] = await getDb().select({
    id: user.id,
    status: user.status,
    password: account.password,
  }).from(user).innerJoin(account, and(eq(account.userId, user.id), eq(account.providerId, "credential")))
    .where(sql`lower(${user.email}) = ${input.email}`).limit(1);

  const credentialsValid = record?.password
    ? await verifyPassword({hash: record.password, password: input.password})
    : (await hashPassword(input.password), false);
  if (!record || !credentialsValid || record.status !== "INACTIVE") {
    throw new InvitationError("REACTIVATION_FAILED");
  }

  const codeHash = invitationCodeHash(input.code);
  try {
    await getDb().transaction(async (transaction) => {
      const [lockedUser] = await transaction.select({id: user.id, status: user.status}).from(user)
        .where(eq(user.id, record.id)).limit(1).for("update");
      const [lockedInvitation] = await transaction.select().from(invitation)
        .where(eq(invitation.codeHash, codeHash)).limit(1).for("update");
      if (!lockedUser || lockedUser.status !== "INACTIVE" || !invitationIsAvailable(lockedInvitation)) {
        throw new InvitationError("REACTIVATION_FAILED");
      }

      const redeemedAt = new Date();
      await transaction.delete(session).where(eq(session.userId, lockedUser.id));
      await transaction.update(user).set({status: "ACTIVE", updatedAt: redeemedAt}).where(eq(user.id, lockedUser.id));
      const [consumed] = await transaction.update(invitation).set({
        redeemedAt,
        redeemedByUserId: lockedUser.id,
        redemptionType: "REACTIVATION",
      }).where(and(
        eq(invitation.id, lockedInvitation.id),
        isNull(invitation.redeemedAt),
        isNull(invitation.revokedAt),
        gt(invitation.expiresAt, redeemedAt),
      )).returning({id: invitation.id});
      if (!consumed) throw new InvitationError("REACTIVATION_FAILED");
      await transaction.insert(referral).values({
        invitationId: lockedInvitation.id,
        referrerUserId: lockedInvitation.creatorId,
        referredUserId: lockedUser.id,
        type: "REACTIVATION",
      });
    });
  } catch (error) {
    if (error instanceof InvitationError) throw error;
    throw new InvitationError("REACTIVATION_FAILED");
  }
}

export async function listAdminInvitations(administratorId: string) {
  const creator = alias(user, "invitation_creator");
  const redeemer = alias(user, "invitation_redeemer");
  const records = await getDb().select({
    id: invitation.id,
    creatorId: invitation.creatorId,
    codeCiphertext: invitation.codeCiphertext,
    codePreview: invitation.codePreview,
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
    revokedAt: invitation.revokedAt,
    redeemedAt: invitation.redeemedAt,
    redemptionType: invitation.redemptionType,
    creatorName: creator.name,
    creatorEmail: creator.email,
    creatorRole: creator.role,
    redeemerName: redeemer.name,
    redeemerEmail: redeemer.email,
  }).from(invitation)
    .innerJoin(creator, eq(invitation.creatorId, creator.id))
    .leftJoin(redeemer, eq(invitation.redeemedByUserId, redeemer.id))
    .orderBy(desc(invitation.createdAt));

  return Promise.all(records.map(async (record) => ({
    id: record.id,
    codePreview: record.codePreview,
    code: record.creatorId === administratorId && getInvitationStatus(record) === "ACTIVE"
      ? await decryptCode(record.codeCiphertext) : null,
    createdAt: record.createdAt.toISOString(),
    expiresAt: record.expiresAt.toISOString(),
    redeemedAt: record.redeemedAt?.toISOString() ?? null,
    revokedAt: record.revokedAt?.toISOString() ?? null,
    redemptionType: record.redemptionType,
    creatorName: record.creatorName,
    creatorEmail: record.creatorEmail,
    creatorRole: record.creatorRole,
    redeemerName: record.redeemerName,
    redeemerEmail: record.redeemerEmail,
    status: getInvitationStatus(record),
  })));
}

export async function getOwnedShareableInvitation(invitationId: string, creatorId: string) {
  const [record] = await getDb().select().from(invitation)
    .where(and(eq(invitation.id, invitationId), eq(invitation.creatorId, creatorId)))
    .limit(1);
  if (!record || !invitationIsAvailable(record)) return null;
  const code = await decryptCode(record.codeCiphertext);
  return code ? {code} : null;
}
