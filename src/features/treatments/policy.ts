import type {AppUser} from "@/db/schema";

export function canBrowseTreatments(account: Pick<AppUser, "role" | "status" | "emailVerified">, hasReport: boolean) {
  return account.role === "USER" && account.status === "ACTIVE" && account.emailVerified && hasReport;
}

export function canChangeRequestStatus(current: string, next: string) {
  if (current === next) return true;
  if (current === "SUBMITTED") return ["APPROVED_FOR_NEXT_STEPS", "DECLINED"].includes(next);
  if (current === "UNDER_REVIEW") return ["APPROVED_FOR_NEXT_STEPS", "DECLINED"].includes(next);
  return false;
}
