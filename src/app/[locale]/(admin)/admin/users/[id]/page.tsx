import {notFound} from "next/navigation";
import {setRequestLocale} from "next-intl/server";

import {AdminUserDetailView} from "@/components/admin/admin-user-detail";
import {getAdminUserDetail} from "@/features/admin/server";
import {adminUserIdSchema} from "@/features/admin/validation";
import type {Locale} from "@/i18n/routing";
import {requireAdmin} from "@/lib/authorization";

export const instant = false;

export default async function AdminUserPage({params}: {params: Promise<{locale: Locale; id: string}>}) {
  const {locale, id} = await params;
  setRequestLocale(locale);
  await requireAdmin(locale, `/admin/users/${id}`);
  if (!adminUserIdSchema.safeParse(id).success) notFound();
  const member = await getAdminUserDetail(id);
  if (!member) notFound();
  return <AdminUserDetailView initialUser={member}/>;
}
