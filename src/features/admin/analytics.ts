import type {AdminDashboardData, AdminReviewSummary, AdminUserDirectoryEntry} from "@/features/admin/types";

export function buildAdminDashboardData(
  members: AdminUserDirectoryEntry[],
  reviews: AdminReviewSummary[],
): AdminDashboardData {
  const recentActivity = [
    ...members.map((member) => ({id: `user-${member.id}`, type: "REGISTRATION" as const, memberName: member.name, occurredAt: member.createdAt, href: "/admin/users"})),
    ...reviews.map((review) => ({id: `review-${review.id}`, type: "REVIEW" as const, memberName: review.memberName, occurredAt: review.updatedAt, status: review.status, href: `/admin/questionnaires/${review.id}`})),
  ].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)).slice(0, 8);

  return {
    counts: {
      totalUsers: members.length,
      activeUsers: members.filter((entry) => entry.status === "ACTIVE").length,
      inactiveUsers: members.filter((entry) => entry.status === "INACTIVE").length,
      requestedReviews: reviews.filter((entry) => entry.status === "REQUESTED").length,
      inReview: reviews.filter((entry) => entry.status === "IN_REVIEW").length,
      completedReviews: reviews.filter((entry) => entry.status === "COMPLETED").length,
    },
    pendingReviews: reviews.filter((entry) => entry.status === "REQUESTED").slice(0, 5),
    recentActivity,
  };
}
