import type {ReviewRequestStatus} from "@/features/assessment/types";
import type {Locale} from "@/i18n/routing";

export type AdminReviewSummary = {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  language: Locale;
  status: ReviewRequestStatus;
  requestedAt: string;
  updatedAt: string;
};

export type AdminUserDirectoryEntry = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  status: "ACTIVE" | "INACTIVE";
  emailVerified: boolean;
  preferredLanguage: Locale;
  referralSource: {name: string; email: string} | null;
  reviewRequests: Array<{id: string; status: ReviewRequestStatus; requestedAt: string}>;
};

export type AdminUserDetail = AdminUserDirectoryEntry & {
  activeSessionCount: number;
  questionnaireCount: number;
  invitationCount: number;
};

export type AdminActivity = {
  id: string;
  type: "REGISTRATION" | "REVIEW";
  memberName: string;
  occurredAt: string;
  status?: ReviewRequestStatus;
  href: string;
};

export type AdminDashboardData = {
  counts: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    requestedReviews: number;
    inReview: number;
    completedReviews: number;
  };
  pendingReviews: AdminReviewSummary[];
  recentActivity: AdminActivity[];
};
