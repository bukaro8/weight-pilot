import type {ReportLanguage} from "@/features/reports/types";
import type {QuestionnaireData} from "@/features/questionnaire/types";

const conditionEmailLabels: Record<string, Record<ReportLanguage, string>> = {
  DIABETES: {en: "Diabetes", es: "Diabetes"}, HIGH_BLOOD_PRESSURE: {en: "High blood pressure", es: "Tensión arterial alta"},
  HEART_CONDITIONS: {en: "Heart conditions", es: "Afecciones cardíacas"}, KIDNEY_OR_LIVER_DISEASE: {en: "Kidney or liver disease", es: "Enfermedad renal o hepática"},
  PANCREATITIS_OR_GALLBLADDER: {en: "Pancreatitis or gallbladder problems", es: "Pancreatitis o problemas de vesícula"}, SERIOUS_DIGESTIVE_PROBLEMS: {en: "Serious digestive problems", es: "Problemas digestivos graves"},
  DIABETIC_EYE_DISEASE: {en: "Diabetic eye disease", es: "Enfermedad ocular diabética"}, PREGNANCY: {en: "Pregnancy, breastfeeding or pregnancy plans", es: "Embarazo, lactancia o planes de embarazo"},
  OTHER: {en: "Other health conditions", es: "Otras afecciones de salud"}, NOT_SURE: {en: "Not sure", es: "No está claro"},
};

export function buildEmailSummary(questionnaireData: QuestionnaireData, bmi: number | null, targetLossPercentage: number | null, language: ReportLanguage) {
  return {
    currentWeightKg: questionnaireData.currentWeightKg,
    targetWeightKg: questionnaireData.targetWeightKg,
    bmi,
    targetLossPercentage,
    healthConsiderations: questionnaireData.healthConditions.filter((condition) => condition !== "NONE").map((condition) => conditionEmailLabels[condition]?.[language] ?? condition),
    medicationStatus: questionnaireData.noMedication ? "NONE_REPORTED" as const : questionnaireData.medications?.trim() ? "REPORTED" as const : "UNCLEAR" as const,
  };
}
