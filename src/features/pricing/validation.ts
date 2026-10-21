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

export const pharmacyReferenceUpdateSchema = z.object({
  source: z.object({
    id: z.uuid(),
    name: z.string().trim().min(2).max(120),
    url: z.url().refine((value) => { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }, "A public HTTPS source URL is required"),
    referenceDate: z.iso.date(),
  }).strict(),
  prices: z.array(z.object({id: z.uuid(), pricePence: z.number().int().min(1).max(1_000_000)}).strict()).min(1).max(100),
}).strict();

export type PharmacyReferenceUpdateInput = z.infer<typeof pharmacyReferenceUpdateSchema>;
