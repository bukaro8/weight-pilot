import "server-only";

import {and, eq, or} from "drizzle-orm";

import {getDb} from "@/db";
import {account, invitation, questionnaire, referral, session, user, verification} from "@/db/schema";
import {userMutationGuard} from "@/features/admin/user-policy";

export type AdminUserMutationResult = "UPDATED" | "DELETED" | "NOT_FOUND" | "ADMIN_PROTECTED" | "SELF_PROTECTED";

export async function updateManagedUserStatus(actorId: string, targetId: string, status: "ACTIVE" | "INACTIVE"): Promise<AdminUserMutationResult> {
  return getDb().transaction(async (transaction) => {
    const [target] = await transaction.select({id: user.id, role: user.role}).from(user).where(eq(user.id, targetId)).limit(1).for("update");
    const guard = userMutationGuard(actorId, target);
    if (guard !== "ALLOWED") return guard;

    const [updated] = await transaction.update(user).set({status, updatedAt: new Date()})
      .where(and(eq(user.id, targetId), eq(user.role, "USER"))).returning({id: user.id});
    if (!updated) return "NOT_FOUND";
    if (status === "INACTIVE") await transaction.delete(session).where(eq(session.userId, targetId));
    return "UPDATED";
  });
}

export async function permanentlyDeleteManagedUser(actorId: string, targetId: string): Promise<AdminUserMutationResult> {
  return getDb().transaction(async (transaction) => {
    const [target] = await transaction.select({id: user.id, email: user.email, role: user.role}).from(user).where(eq(user.id, targetId)).limit(1).for("update");
    const guard = userMutationGuard(actorId, target);
    if (guard !== "ALLOWED") return guard;

    // Restrictive invitation/referral relationships are removed explicitly.
    // Questionnaire review requests, reports and delivery attempts then cascade
    // from the questionnaire; Better Auth sessions/accounts also cascade, but
    // are deleted explicitly so access is revoked before the user row is removed.
    await transaction.delete(session).where(eq(session.userId, targetId));
    await transaction.delete(account).where(eq(account.userId, targetId));
    await transaction.delete(referral).where(or(eq(referral.referrerUserId, targetId), eq(referral.referredUserId, targetId)));
    await transaction.delete(invitation).where(or(eq(invitation.creatorId, targetId), eq(invitation.redeemedByUserId, targetId)));
    await transaction.delete(questionnaire).where(eq(questionnaire.userId, targetId));
    await transaction.delete(verification).where(eq(verification.identifier, target.email));

    const [deleted] = await transaction.delete(user)
      .where(and(eq(user.id, targetId), eq(user.role, "USER"))).returning({id: user.id});
    return deleted ? "DELETED" : "NOT_FOUND";
  });
}
