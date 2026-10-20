import {z} from "zod";

export const sexOptions = ["FEMALE", "MALE", "INTERSEX", "PREFER_NOT_TO_SAY"] as const;
export const healthConditionOptions = [
  "DIABETES", "HIGH_BLOOD_PRESSURE", "HEART_CONDITIONS", "KIDNEY_OR_LIVER_DISEASE",
  "PANCREATITIS_OR_GALLBLADDER", "SERIOUS_DIGESTIVE_PROBLEMS", "DIABETIC_EYE_DISEASE",
  "PREGNANCY", "OTHER", "NONE", "NOT_SURE",
] as const;

export const sexSchema = z.enum(sexOptions);
export const healthConditionSchema = z.enum(healthConditionOptions);

const ageSchema = z.number().int().min(18).max(120);
const heightSchema = z.number().min(100).max(250);
const weightSchema = z.number().min(30).max(400);

export const aboutYouStepSchema = z.object({
  age: ageSchema,
  sexAssignedAtBirth: sexSchema,
  heightCm: heightSchema,
  currentWeightKg: weightSchema,
});
export const goalStepSchema = z.object({currentWeightKg: weightSchema, targetWeightKg: weightSchema}).refine(
  (value) => value.targetWeightKg < value.currentWeightKg,
  {path: ["targetWeightKg"], message: "TARGET_NOT_LOWER"},
);

export const healthConditionsSchema = z.array(healthConditionSchema).max(healthConditionOptions.length).refine(
  (values) => new Set(values).size === values.length,
  {message: "DUPLICATE_SELECTION"},
).refine(
  (values) => !((values.includes("NONE") || values.includes("NOT_SURE")) && values.length > 1),
  {message: "EXCLUSIVE_SELECTION"},
);

export const questionnaireDraftSchema = z.object({
  questionnaireId: z.uuid(),
  currentStep: z.number().int().min(1).max(5),
  measurementSystem: z.enum(["METRIC", "IMPERIAL"]),
  age: ageSchema.nullable(),
  sexAssignedAtBirth: sexSchema.nullable(),
  heightCm: heightSchema.nullable(),
  currentWeightKg: weightSchema.nullable(),
  targetWeightKg: weightSchema.nullable(),
  healthConditions: healthConditionsSchema,
  medications: z.string().trim().max(2000).nullable(),
  noMedication: z.boolean(),
}).superRefine((value, context) => {
  if (value.noMedication && value.medications) context.addIssue({code: "custom", path: ["medications"], message: "MEDICATION_CONFLICT"});
});

export const questionnaireSubmissionSchema = questionnaireDraftSchema.superRefine((value, context) => {
  if (value.age === null) context.addIssue({code: "custom", path: ["age"], message: "REQUIRED"});
  if (value.sexAssignedAtBirth === null) context.addIssue({code: "custom", path: ["sexAssignedAtBirth"], message: "REQUIRED"});
  if (value.heightCm === null) context.addIssue({code: "custom", path: ["heightCm"], message: "REQUIRED"});
  if (value.currentWeightKg === null) context.addIssue({code: "custom", path: ["currentWeightKg"], message: "REQUIRED"});
  if (value.targetWeightKg === null) context.addIssue({code: "custom", path: ["targetWeightKg"], message: "REQUIRED"});
  if (value.healthConditions.length === 0) context.addIssue({code: "custom", path: ["healthConditions"], message: "REQUIRED"});
  if (value.currentWeightKg !== null && value.targetWeightKg !== null && value.targetWeightKg >= value.currentWeightKg) {
    context.addIssue({code: "custom", path: ["targetWeightKg"], message: "TARGET_NOT_LOWER"});
  }
});

export const questionnaireSubmitRequestSchema = z.object({questionnaireId: z.uuid()});

export type QuestionnaireDraftInput = z.infer<typeof questionnaireDraftSchema>;
export type QuestionnaireSubmissionInput = z.infer<typeof questionnaireSubmissionSchema>;
export type HealthCondition = z.infer<typeof healthConditionSchema>;
export type SexAssignedAtBirth = z.infer<typeof sexSchema>;
