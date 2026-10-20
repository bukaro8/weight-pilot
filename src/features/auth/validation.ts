import {z} from "zod";

export const emailSchema = z.string().trim().email().max(254);
export const passwordSchema = z.string().min(9).max(128);

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((values) => values.password === values.confirmPassword, {
  path: ["confirmPassword"],
  message: "passwords_must_match",
});
