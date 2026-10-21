import {z} from "zod";

export const privateMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  clientMessageId: z.uuid(),
}).strict();

export const conversationIdSchema = z.uuid();

export type PrivateMessageInput = z.infer<typeof privateMessageSchema>;
