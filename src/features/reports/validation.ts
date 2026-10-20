import {z} from "zod";

export const reportIdSchema = z.uuid();
export const reportDraftSchema = z.object({
  language: z.enum(["en", "es"]),
  content: z.string().trim().max(30_000),
});

export const reportSendSchema = z.object({confirm: z.literal(true)});
