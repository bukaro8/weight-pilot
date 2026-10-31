export type InvitationKind = "STANDARD" | "MASTER";
export type InvitationStatus = "ACTIVE" | "USED" | "EXPIRED" | "REVOKED";

export type InvitationState = {
  kind: InvitationKind;
  redeemedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date | null;
};

export function getInvitationStatus(record: InvitationState, now = new Date()): InvitationStatus {
  if (record.revokedAt) return "REVOKED";
  if (record.kind === "MASTER") return "ACTIVE";
  if (record.redeemedAt) return "USED";
  if (!record.expiresAt || record.expiresAt <= now) return "EXPIRED";
  return "ACTIVE";
}

export function invitationIsAvailable(record: InvitationState | undefined, now = new Date()) {
  return Boolean(record && getInvitationStatus(record, now) === "ACTIVE");
}
