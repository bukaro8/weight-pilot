import {setRequestLocale} from "next-intl/server";
import {AdminInvitations} from "@/components/invitations/admin-invitations";
import {listAdminInvitations} from "@/features/invitations/server";
import {requireAdmin} from "@/lib/authorization";
import type {Locale} from "@/i18n/routing";

export default async function AdminPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  await requireAdmin(locale);
  const invitations = await listAdminInvitations();
  return <AdminInvitations initialInvitations={invitations}/>;
}
