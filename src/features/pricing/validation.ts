import {z} from "zod";

const treatmentPricePenceSchema = z.number().int().min(1).max(1_000_000);
const deliveryPricePenceSchema = z.number().int().min(0).max(1_000_000);
const treatmentTiersSchema = z.object({
  1: treatmentPricePenceSchema,
  2: treatmentPricePenceSchema,
  3: treatmentPricePenceSchema,
  4: treatmentPricePenceSchema,
  5: treatmentPricePenceSchema,
}).strict();

export const pricingUpdateSchema = z.object({
  treatments: z.object({
    SEMAGLUTIDE: treatmentTiersSchema,
    TIRZEPATIDE: treatmentTiersSchema,
  }).strict(),
  delivery: z.object({
    STANDARD_NEXT_DAY: deliveryPricePenceSchema,
    GUARANTEED_NEXT_DAY: deliveryPricePenceSchema,
  }).strict(),
}).strict();

export type PricingUpdateInput = z.infer<typeof pricingUpdateSchema>;
