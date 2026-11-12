import {z} from "zod";

export const followUpCategorySchema = z.enum(["INCOMPLETE_ASSESSMENT", "TREATMENT_FOLLOW_UP"]);
export const followUpSendSchema = z.strictObject({
  memberId: z.uuid(),
  category: followUpCategorySchema,
  clientActionId: z.uuid(),
  language: z.enum(["en", "es"]),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(2000),
  confirmed: z.literal(true),
  confirmRecent: z.boolean(),
});
export const followUpOptOutSchema = z.object({memberId: z.uuid(), doNotRemind: z.boolean()});
