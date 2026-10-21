import {z} from "zod";

export const treatmentSchema = z.enum(["SEMAGLUTIDE", "TIRZEPATIDE"]);
export const requestStatusSchema = z.enum(["SUBMITTED", "UNDER_REVIEW", "APPROVED_FOR_NEXT_STEPS", "DECLINED", "CANCELLED"]);

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
}).strict().refine((value) => value.status !== "DECLINED" || value.declineReason.length >= 5);

export type CreateTreatmentRequest = z.infer<typeof createTreatmentRequestSchema>;
export type UpdateTreatmentRequest = z.infer<typeof updateTreatmentRequestSchema>;
