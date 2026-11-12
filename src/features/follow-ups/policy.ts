import type {FollowUpCategory} from "./types";

const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

export function followUpEligible(input: {
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "INACTIVE";
  emailVerified: boolean;
  category: FollowUpCategory;
  hasDraft: boolean;
  hasSubmittedAssessment: boolean;
  hasApprovedRequest: boolean;
  doNotRemind: boolean;
}) {
  if (input.role !== "USER" || input.status !== "ACTIVE" || !input.emailVerified || input.doNotRemind) return false;
  return input.category === "INCOMPLETE_ASSESSMENT"
    ? input.hasDraft && !input.hasSubmittedAssessment
    : input.hasApprovedRequest;
}

export function needsRecentReminderConfirmation(lastAcceptedAt: Date | string | null, now = new Date()) {
  if (!lastAcceptedAt) return false;
  const elapsed = now.getTime() - new Date(lastAcceptedAt).getTime();
  return elapsed >= 0 && elapsed < sevenDaysMs;
}
