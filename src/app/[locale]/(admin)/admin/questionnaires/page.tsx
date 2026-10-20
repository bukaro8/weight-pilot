import {setRequestLocale} from "next-intl/server";

import {AdminQuestionnaires} from "@/components/questionnaire/admin-questionnaires";
import {listAdminQuestionnaireSubmissions} from "@/features/questionnaire/server";
import type {Locale} from "@/i18n/routing";
import {requireAdmin} from "@/lib/authorization";

export default async function AdminQuestionnairesPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  await requireAdmin(locale, "/admin/questionnaires");
  const submissions = await listAdminQuestionnaireSubmissions();
  return <AdminQuestionnaires initialSubmissions={submissions}/>;
}
