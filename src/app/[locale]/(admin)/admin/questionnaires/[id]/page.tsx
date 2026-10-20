import {notFound} from "next/navigation";
import {setRequestLocale} from "next-intl/server";

import {ReportWorkspace} from "@/components/reports/report-workspace";
import {getReportWorkspace, ReportError} from "@/features/reports/server";
import {reportIdSchema} from "@/features/reports/validation";
import type {Locale} from "@/i18n/routing";
import {requireAdmin} from "@/lib/authorization";

export const instant = false;

export default async function AdminReportPage({params}: {params: Promise<{locale: Locale; id: string}>}) {
  const {locale, id} = await params;
  setRequestLocale(locale);
  await requireAdmin(locale, `/admin/questionnaires/${id}`);
  if (!reportIdSchema.safeParse(id).success) notFound();
  let workspace;
  try {
    workspace = await getReportWorkspace(id);
  } catch (error) {
    if (error instanceof ReportError && error.code === "REPORT_NOT_FOUND") notFound();
    throw error;
  }
  return <ReportWorkspace initialWorkspace={workspace}/>;
}
