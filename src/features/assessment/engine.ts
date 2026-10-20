import "server-only";

import {assessmentEngineVersion, type AssessmentOutcome, type HealthConsiderationKey} from "@/features/assessment/types";
import {evaluateAssessmentDecision} from "@/features/assessment/decision";
import {calculateBmi, calculateTargetLossPercentage} from "@/features/questionnaire/calculations";
import type {QuestionnaireData} from "@/features/questionnaire/types";

const conditionConsiderations = {
  DIABETES: "DIABETES",
  HIGH_BLOOD_PRESSURE: "CARDIOVASCULAR",
  HEART_CONDITIONS: "CARDIOVASCULAR",
  KIDNEY_OR_LIVER_DISEASE: "KIDNEY_OR_LIVER",
  PANCREATITIS_OR_GALLBLADDER: "PANCREATITIS_OR_GALLBLADDER",
  SERIOUS_DIGESTIVE_PROBLEMS: "SERIOUS_DIGESTIVE",
  DIABETIC_EYE_DISEASE: "DIABETIC_EYE",
  PREGNANCY: "PREGNANCY",
  OTHER: "OTHER_CONDITIONS",
  NOT_SURE: "UNCERTAIN_HEALTH_INFORMATION",
} as const satisfies Partial<Record<QuestionnaireData["healthConditions"][number], HealthConsiderationKey>>;

export function calculatePreliminaryAssessment(input: QuestionnaireData): AssessmentOutcome {
  const considerations = new Set<HealthConsiderationKey>();
  for (const condition of input.healthConditions) {
    const consideration = conditionConsiderations[condition as keyof typeof conditionConsiderations];
    if (consideration) considerations.add(consideration);
  }

  const medicationText = input.medications?.trim() ?? "";
  const medicationInformation = input.noMedication && !medicationText
    ? "NONE_REPORTED"
    : !input.noMedication && medicationText
      ? "PROVIDED"
      : "INCOMPLETE";
  if (medicationInformation === "PROVIDED") considerations.add("CURRENT_MEDICATION");
  if (medicationInformation === "INCOMPLETE") considerations.add("MEDICATION_INFORMATION_INCOMPLETE");

  const orderedConsiderations = [...considerations];
  const decision = evaluateAssessmentDecision(input);
  const canCalculateBmi = input.heightCm !== null && input.heightCm > 0 && input.currentWeightKg !== null && input.currentWeightKg > 0;
  const canCalculateTargetLoss = input.currentWeightKg !== null && input.currentWeightKg > 0 && input.targetWeightKg !== null && input.targetWeightKg > 0 && input.targetWeightKg < input.currentWeightKg;
  return {
    engineVersion: assessmentEngineVersion,
    bmi: canCalculateBmi ? calculateBmi(input.currentWeightKg!, input.heightCm!) : null,
    targetWeightLossPercentage: canCalculateTargetLoss ? calculateTargetLossPercentage(input.currentWeightKg!, input.targetWeightKg!) : null,
    age: input.age,
    sexAssignedAtBirth: input.sexAssignedAtBirth,
    currentWeightKg: input.currentWeightKg,
    targetWeightKg: input.targetWeightKg,
    considerations: orderedConsiderations,
    requiresIndividualAssessment: decision.status === "REVIEW_REQUIRED",
    medicationInformation,
    decisionStatus: decision.status,
    treatmentToDiscuss: decision.treatmentToDiscuss,
    decisionReasons: decision.reasons,
  };
}
