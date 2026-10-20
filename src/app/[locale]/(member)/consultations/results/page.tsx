import {setRequestLocale} from "next-intl/server";

import {TreatmentResults} from "@/components/assessment/treatment-results";
import {getMemberReviewRequest} from "@/features/assessment/server";
import {getFirstName} from "@/features/auth/name";
import {getMemberSubmittedQuestionnaire, QuestionnaireError} from "@/features/questionnaire/server";
import type {Locale} from "@/i18n/routing";
import {redirect} from "@/i18n/navigation";
import {requireMember} from "@/lib/authorization";

export default async function TreatmentResultsPage({
  params,
}: {
  params: Promise<{locale: Locale}>;
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const currentUser = await requireMember(locale, "/consultations/results");
  const questionnaire = await getMemberSubmittedQuestionnaire(currentUser.id).catch((error: unknown) => {
    if (error instanceof QuestionnaireError && error.code === "QUESTIONNAIRE_NOT_FOUND") return null;
    throw error;
  });
  if (!questionnaire) return redirect({href: "/consultations", locale});
  const reviewRequest = await getMemberReviewRequest(currentUser.id, questionnaire.id);
  if (!questionnaire.assessmentOutcome) throw new Error("ASSESSMENT_NOT_AVAILABLE");

  return <TreatmentResults
    questionnaireId={questionnaire.id}
    firstName={getFirstName(currentUser.name)}
    outcome={questionnaire.assessmentOutcome}
    healthConditions={questionnaire.healthConditions}
    preferredReportLanguage={currentUser.preferredLanguage}
    initialReviewRequest={reviewRequest}
  />;
}
