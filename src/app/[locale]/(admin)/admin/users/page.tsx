import {setRequestLocale} from "next-intl/server";

import {AdminUserDirectory} from "@/components/admin/admin-user-directory";
import {listAdminUsers} from "@/features/admin/server";
import type {Locale} from "@/i18n/routing";
import {requireAdmin} from "@/lib/authorization";

export default async function AdminUsersPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  await requireAdmin(locale, "/admin/users");
  const users = await listAdminUsers();
  return <AdminUserDirectory initialUsers={users}/>;
}
