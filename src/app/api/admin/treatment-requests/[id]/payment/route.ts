import {getAdminApiUser, adminApiError} from "@/features/admin/api";

// Retired one-email endpoint: use the communication history workflow instead.
// Keeping an explicit response prevents older clients from creating untracked sends.
export async function POST(request: Request) {
  const admin = await getAdminApiUser(request);
  if (!admin) return adminApiError("REQUEST_FORBIDDEN", 403);
  return adminApiError("USE_COMMUNICATION_COMPOSER", 410);
}
