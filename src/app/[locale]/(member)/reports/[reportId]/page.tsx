import {notFound} from "next/navigation";
import {setRequestLocale} from "next-intl/server";

import {MemberReportReader} from "@/components/reports/member-report-reader";
import {getMemberAvailableReport} from "@/features/reports/member";
import {redirect} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";
import {requireMember} from "@/lib/authorization";

export default async function MemberReportPage({params}: {params: Promise<{locale: Locale; reportId: string}>}) {
  const {locale, reportId} = await params;
  setRequestLocale(locale);
  const member = await requireMember(locale, `/reports/${reportId}`);
  if (member.role === "ADMIN") redirect({href: "/admin", locale});
  const report = await getMemberAvailableReport(member.id, reportId);
  if (!report) notFound();
  return <MemberReportReader emailHtml={report.emailHtml} assessmentReference={report.assessmentReference} availableAt={report.availableAt} locale={locale}/>;
}
