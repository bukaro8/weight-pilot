import {getQuestionnaireApiUser, questionnaireApiSuccess} from "@/features/questionnaire/api";
import {getCatalogueAccess} from "@/features/treatments/server";

export async function GET(request: Request) {
  const member = await getQuestionnaireApiUser(request);
  if (!member || member.role !== "USER") return questionnaireApiSuccess({eligible: false});
  const access = await getCatalogueAccess(member);
  return questionnaireApiSuccess({eligible: access.eligible});
}
