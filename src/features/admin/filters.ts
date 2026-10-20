import type {AdminUserDirectoryEntry} from "@/features/admin/types";

export type UserStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
export type VerificationFilter = "ALL" | "VERIFIED" | "UNVERIFIED";

export function filterAdminUsers(
  users: AdminUserDirectoryEntry[],
  query: string,
  status: UserStatusFilter,
  verification: VerificationFilter,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return users.filter((entry) => {
    const matchesQuery = !normalizedQuery || `${entry.name} ${entry.email}`.toLocaleLowerCase().includes(normalizedQuery);
    const matchesStatus = status === "ALL" || entry.status === status;
    const matchesVerification = verification === "ALL" || (verification === "VERIFIED" ? entry.emailVerified : !entry.emailVerified);
    return matchesQuery && matchesStatus && matchesVerification;
  });
}
