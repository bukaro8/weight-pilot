export const assessmentDecisionVersion = 2 as const;

export const assessmentDecisionReasonKeys = [
  "HEALTH_CONDITION_SELECTED",
  "CURRENT_MEDICATION",
  "HEALTH_STATUS_UNCERTAIN",
  "MEDICATION_STATUS_UNCLEAR",
  "INCOMPLETE_OR_INCONSISTENT",
  "NO_DEFENSIBLE_DISTINCTION",
] as const;

export type AssessmentDecisionReasonKey = typeof assessmentDecisionReasonKeys[number];
export type TreatmentToDiscuss = "TIRZEPATIDE";
export type AssessmentDecision = {
  status: "REVIEW_REQUIRED" | "DISCUSS_TREATMENT";
  treatmentToDiscuss: TreatmentToDiscuss | null;
  reasons: AssessmentDecisionReasonKey[];
};

type DecisionInput = {
  status: string;
  age: number | null;
  sexAssignedAtBirth: string | null;
  heightCm: number | null;
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  healthConditions: string[];
  medications: string | null;
  noMedication: boolean;
};

const knownSexValues = new Set(["FEMALE", "MALE", "INTERSEX", "PREFER_NOT_TO_SAY"]);
const knownHealthValues = new Set([
  "DIABETES", "HIGH_BLOOD_PRESSURE", "HEART_CONDITIONS", "KIDNEY_OR_LIVER_DISEASE",
  "PANCREATITIS_OR_GALLBLADDER", "SERIOUS_DIGESTIVE_PROBLEMS", "DIABETIC_EYE_DISEASE",
  "PREGNANCY", "OTHER", "NONE", "NOT_SURE",
]);

function review(...reasons: AssessmentDecisionReasonKey[]): AssessmentDecision {
  return {status: "REVIEW_REQUIRED", treatmentToDiscuss: null, reasons: [...new Set(reasons)]};
}

function isFiniteWithin(value: number | null, minimum: number, maximum: number) {
  return value !== null && Number.isFinite(value) && value >= minimum && value <= maximum;
}

/**
 * Version 2 safety-first decision rules.
 *
 * A treatment is named only for a complete, internally consistent questionnaire
 * reporting no listed condition and no current medication, with BMI >= 30 and a
 * 15–25% target. That narrow profile overlaps the adult, non-diabetic obesity
 * population and weight-loss range studied in SURMOUNT-5. The result identifies
 * tirzepatide only as an evidence-supported topic to discuss; it never establishes
 * safety, suitability, a dose, or an expected individual result.
 *
 * Every safety flag, uncertain/missing answer, non-matching evidence profile, or
 * unresolved distinction returns REVIEW_REQUIRED without naming a treatment.
 */
export function evaluateAssessmentDecision(input: DecisionInput): AssessmentDecision {
  const medicationText = input.medications?.trim() ?? "";
  const uniqueHealthValues = new Set(input.healthConditions);
  const healthAnswersValid = input.healthConditions.length > 0 &&
    uniqueHealthValues.size === input.healthConditions.length &&
    input.healthConditions.every((item) => knownHealthValues.has(item)) &&
    !((uniqueHealthValues.has("NONE") || uniqueHealthValues.has("NOT_SURE")) && uniqueHealthValues.size > 1);
  const requiredAnswersValid = input.status === "SUBMITTED" &&
    Number.isInteger(input.age) && isFiniteWithin(input.age, 18, 120) &&
    input.sexAssignedAtBirth !== null && knownSexValues.has(input.sexAssignedAtBirth) &&
    isFiniteWithin(input.heightCm, 100, 250) && isFiniteWithin(input.currentWeightKg, 30, 400) &&
    isFiniteWithin(input.targetWeightKg, 30, 400) && input.targetWeightKg! < input.currentWeightKg! &&
    healthAnswersValid && !(input.noMedication && medicationText.length > 0);

  if (!requiredAnswersValid) return review("INCOMPLETE_OR_INCONSISTENT");
  if (uniqueHealthValues.has("NOT_SURE")) return review("HEALTH_STATUS_UNCERTAIN");
  if ([...uniqueHealthValues].some((item) => item !== "NONE")) return review("HEALTH_CONDITION_SELECTED");
  if (!input.noMedication && medicationText.length > 0) return review("CURRENT_MEDICATION");
  if (!input.noMedication) return review("MEDICATION_STATUS_UNCLEAR");

  const heightMetres = input.heightCm! / 100;
  const bmi = input.currentWeightKg! / (heightMetres * heightMetres);
  const targetLoss = ((input.currentWeightKg! - input.targetWeightKg!) / input.currentWeightKg!) * 100;
  if (bmi < 30 || targetLoss < 15 || targetLoss > 25) return review("NO_DEFENSIBLE_DISTINCTION");

  return {status: "DISCUSS_TREATMENT", treatmentToDiscuss: "TIRZEPATIDE", reasons: []};
}
