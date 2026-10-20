import {setRequestLocale} from "next-intl/server";

import {AdminInvitations} from "@/components/invitations/admin-invitations";
import {listAdminInvitations} from "@/features/invitations/server";
import type {Locale} from "@/i18n/routing";
import {requireAdmin} from "@/lib/authorization";

export default async function AdminInvitationsPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  await requireAdmin(locale, "/admin/invitations");
  const invitations = await listAdminInvitations();
  return <AdminInvitations initialInvitations={invitations}/>;
}
