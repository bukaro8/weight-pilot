import {z} from "zod";

export const treatmentSchema = z.enum(["SEMAGLUTIDE", "TIRZEPATIDE"]);
export const requestStatusSchema = z.enum(["APPROVED_FOR_NEXT_STEPS", "DECLINED"]);

const ukPostcode = /^(?:GIR ?0AA|[A-Z]{1,2}\d[A-Z\d]? ?\d[ABD-HJLNP-UW-Z]{2})$/u;
export function normaliseUkPostcode(value: string) {
  const compact = value.trim().toUpperCase().replace(/\s+/gu, "");
  return compact.length > 3 ? `${compact.slice(0, -3)} ${compact.slice(-3)}` : compact;
}

export const createTreatmentRequestSchema = z.object({
  clientRequestId: z.uuid(),
  reportId: z.uuid(),
  treatment: treatmentSchema,
  fullName: z.string().trim().min(2).max(160),
  streetAddress: z.string().trim().min(5).max(160),
  flatNumber: z.string().trim().max(80),
  buildingName: z.string().trim().max(120),
  city: z.string().trim().min(2).max(100),
  postcode: z.string().transform(normaliseUkPostcode).pipe(z.string().regex(ukPostcode)),
  telephone: z.string().trim().min(10).max(30).regex(/^\+?[\d()\s.-]+$/u).refine((value) => {
    const digits = value.replace(/\D/gu, "");
    const national = value.startsWith("+44") ? `0${digits.slice(2)}` : digits.startsWith("0044") ? `0${digits.slice(4)}` : digits;
    return /^0[1-9]\d{8,9}$/u.test(national);
  }),
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

export const paymentAuthorisationSchema = z.object({
  treatment: treatmentSchema,
  strength: z.string().trim().max(20),
  prescriptionReference: z.string().trim().min(3).max(160),
  supplyAuthorisationReference: z.string().trim().min(3).max(160),
  prescribingVerified: z.literal(true),
  supplyVerified: z.literal(true),
}).strict().superRefine((value, context) => {
  if (!(approvedStrengths[value.treatment] as readonly string[]).includes(value.strength)) context.addIssue({code: "custom", path: ["strength"], message: "Choose a listed strength."});
});

export const treatmentCommunicationSchema = z.object({
  clientMessageId: z.uuid(),
  type: z.enum(["ADMIN_UPDATE", "PAYMENT_INSTRUCTIONS"]),
  treatment: treatmentSchema,
  strength: z.string().trim().max(20),
  message: z.string().trim().max(2000),
  authorisationId: z.uuid().nullable(),
}).strict().superRefine((value, context) => {
  if (!(approvedStrengths[value.treatment] as readonly string[]).includes(value.strength)) context.addIssue({code: "custom", path: ["strength"], message: "Choose a listed strength."});
  if (value.type === "ADMIN_UPDATE" && value.message.length < 5) context.addIssue({code: "custom", path: ["message"], message: "Add a short update."});
  if (value.type === "PAYMENT_INSTRUCTIONS" && !value.authorisationId) context.addIssue({code: "custom", path: ["authorisationId"], message: "Verified supply authorisation is required."});
});
