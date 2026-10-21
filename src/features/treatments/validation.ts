import {z} from "zod";

export const treatmentSchema = z.enum(["SEMAGLUTIDE", "TIRZEPATIDE"]);
export const requestStatusSchema = z.enum(["APPROVED_FOR_NEXT_STEPS", "DECLINED"]);

export const createTreatmentRequestSchema = z.object({
  clientRequestId: z.uuid(),
  reportId: z.uuid(),
  treatment: treatmentSchema,
  fullName: z.string().trim().min(2).max(160),
  address: z.string().trim().min(5).max(500),
  postcode: z.string().trim().min(3).max(30),
  telephone: z.string().trim().min(7).max(30).regex(/^[+()\d\s.-]+$/),
  message: z.string().trim().max(1000).optional(),
  language: z.enum(["en", "es"]),
}).strict();

export const updateTreatmentRequestSchema = z.object({
  status: requestStatusSchema,
  internalNote: z.string().trim().max(2000),
  declineReason: z.string().trim().max(1000),
  approvedTreatment: treatmentSchema.nullable(),
  approvedStrength: z.string().trim().max(20).nullable(),
}).strict().refine((value) => value.status !== "DECLINED" || value.declineReason.length >= 5);

export const approvedStrengths = {
  SEMAGLUTIDE: ["0.25 mg", "0.5 mg", "1 mg", "1.7 mg", "2.4 mg"],
  TIRZEPATIDE: ["2.5 mg", "5 mg", "7.5 mg", "10 mg", "12.5 mg", "15 mg"],
} as const;

export const treatmentDecisionSchema = updateTreatmentRequestSchema.superRefine((value, context) => {
  if (value.status !== "APPROVED_FOR_NEXT_STEPS") return;
  const allowedStrengths: readonly string[] = value.approvedTreatment ? approvedStrengths[value.approvedTreatment] : [];
  if (!value.approvedTreatment || !value.approvedStrength || !allowedStrengths.includes(value.approvedStrength)) {
    context.addIssue({code: "custom", path: ["approvedStrength"], message: "An approved product and configured strength are required."});
  }
});

export type CreateTreatmentRequest = z.infer<typeof createTreatmentRequestSchema>;
export type UpdateTreatmentRequest = z.infer<typeof updateTreatmentRequestSchema>;
