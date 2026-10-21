import {adminApiError, adminApiSuccess, getAdminApiUser} from "@/features/admin/api";
import {listAdminConversations} from "@/features/messages/server";

export async function GET(request: Request) {
  const admin = await getAdminApiUser(request);
  if (!admin) return adminApiError("UNAUTHORISED", 401);
  try { return adminApiSuccess({conversations: await listAdminConversations(admin.id)}); }
  catch { return adminApiError("MESSAGES_UNAVAILABLE", 500); }
}
