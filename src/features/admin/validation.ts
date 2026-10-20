import {z} from "zod";

export const adminUserIdSchema = z.uuid();
export const adminUserStatusSchema = z.object({status: z.enum(["ACTIVE", "INACTIVE"])});
export const adminUserDeleteSchema = z.object({confirmation: z.literal("DELETE")});
