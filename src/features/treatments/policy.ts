import type {AppUser} from "@/db/schema";

export function canBrowseTreatments(account: Pick<AppUser, "role" | "status" | "emailVerified">, hasReport: boolean) {
  return account.role === "USER" && account.status === "ACTIVE" && account.emailVerified && hasReport;
}

export function canChangeRequestStatus(current: string, next: string) {
  if (current === next) return true;
  if (current === "SUBMITTED") return ["UNDER_REVIEW", "DECLINED", "CANCELLED"].includes(next);
  if (current === "UNDER_REVIEW") return ["APPROVED_FOR_NEXT_STEPS", "DECLINED", "CANCELLED"].includes(next);
  return false;
}
