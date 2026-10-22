import {notFound} from "next/navigation";
import {setRequestLocale} from "next-intl/server";

import {MemberReportReader} from "@/components/reports/member-report-reader";
import {MarkNotificationViewed} from "@/components/navigation/mark-notification-viewed";
import {getMemberAvailableReport} from "@/features/reports/member";
import {getTreatmentPricing} from "@/features/pricing/server";
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
  const pricing = report.recommendedTreatment ? await getTreatmentPricing().catch(() => null) : null;
  const recommendedPricePence = report.recommendedTreatment && pricing ? pricing.treatments[report.recommendedTreatment][1] : null;
  return <><MarkNotificationViewed kind="report" id={report.id}/><MemberReportReader emailHtml={report.emailHtml} assessmentReference={report.assessmentReference} availableAt={report.availableAt} locale={locale} reportId={report.id} recommendedTreatment={report.recommendedTreatment} recommendedPricePence={recommendedPricePence}/></>;
}
