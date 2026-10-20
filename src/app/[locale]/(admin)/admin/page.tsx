import {setRequestLocale} from "next-intl/server";
import {AdminDashboard} from "@/components/admin/admin-dashboard";
import {getAdminDashboardData} from "@/features/admin/server";
import {requireAdmin} from "@/lib/authorization";
import type {Locale} from "@/i18n/routing";

export default async function AdminPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  await requireAdmin(locale);
  const data = await getAdminDashboardData();
  return <AdminDashboard data={data} locale={locale}/>;
}
