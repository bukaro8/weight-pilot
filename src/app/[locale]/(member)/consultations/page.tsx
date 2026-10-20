import {setRequestLocale} from "next-intl/server";
import {QuestionnaireFlow} from "@/components/questionnaire/questionnaire-flow";
import {getOrCreateMemberQuestionnaire} from "@/features/questionnaire/server";
import {requireMember} from "@/lib/authorization";
import type {Locale} from "@/i18n/routing";
import {redirect} from "@/i18n/navigation";

export default async function ConsultationsPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const currentUser = await requireMember(locale, "/consultations");
  const questionnaire = await getOrCreateMemberQuestionnaire(currentUser.id);
  if (questionnaire.status === "SUBMITTED") redirect({href: "/consultations/results", locale});
  return <QuestionnaireFlow initialQuestionnaire={questionnaire}/>;
}
