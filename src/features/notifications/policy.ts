export type NavigationCounts = {messages: number; reports: number; requests: number; treatmentRequests: number};

export const emptyNavigationCounts: NavigationCounts = {messages: 0, reports: 0, requests: 0, treatmentRequests: 0};
export const memberRequestUnreadStatuses = ["UNDER_REVIEW", "APPROVED_FOR_NEXT_STEPS", "DECLINED"] as const;

export function badgeText(count: number) {
  return count > 9 ? "9+" : String(count);
}

export function memberNavigationCount(counts: NavigationCounts) {
  return counts.messages + counts.reports + counts.requests;
}

export function adminNavigationCount(counts: NavigationCounts) {
  return counts.messages + counts.treatmentRequests;
}
