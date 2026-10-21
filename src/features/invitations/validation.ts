import {z} from "zod";

import {emailSchema, passwordSchema} from "@/features/auth/validation";

export const invitationCodeSchema = z.string().trim().regex(/^WP_[A-Za-z0-9_-]{32}$/);

export const invitationRegistrationSchema = z.object({
  code: invitationCodeSchema,
  name: z.string().trim().min(2).max(120),
  email: emailSchema.transform((value) => value.toLowerCase()),
  password: passwordSchema,
  preferredLanguage: z.enum(["en", "es"]),
});

export const invitationReactivationSchema = z.object({
  code: invitationCodeSchema,
  email: emailSchema.transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

export const invitationEmailSchema = z.object({
  email: emailSchema.transform((value) => value.toLowerCase()),
  language: z.enum(["en", "es"]),
}).strict();

export type InvitationRegistrationInput = z.infer<typeof invitationRegistrationSchema>;
export type InvitationReactivationInput = z.infer<typeof invitationReactivationSchema>;
