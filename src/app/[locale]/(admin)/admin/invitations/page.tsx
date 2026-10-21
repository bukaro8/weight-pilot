import {setRequestLocale} from "next-intl/server";

import {AdminInvitations} from "@/components/invitations/admin-invitations";
import {listAdminInvitations} from "@/features/invitations/server";
import {publicInvitationOrigin} from "@/features/invitations/sharing";
import type {Locale} from "@/i18n/routing";
import {requireAdmin} from "@/lib/authorization";

export default async function AdminInvitationsPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const currentUser = await requireAdmin(locale, "/admin/invitations");
  const invitations = await listAdminInvitations(currentUser.id);
  return <AdminInvitations initialInvitations={invitations} publicOrigin={publicInvitationOrigin(process.env.PUBLIC_APP_URL || process.env.BETTER_AUTH_URL)}/>;
}
