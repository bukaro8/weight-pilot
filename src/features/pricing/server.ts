import "server-only";

import {and, eq} from "drizzle-orm";

import {deliveryReferencePrice, treatmentReferencePrice} from "@/db/schema";
import {getDb} from "@/db";
import {buildPricingScenarios} from "@/features/pricing/calculations";
import {
  referenceDeliveryMethods,
  referenceMonthTiers,
  referenceTreatments,
  type PricingBook,
  type ReferenceDeliveryMethod,
  type ReferenceMonthTier,
  type ReferenceTreatment,
} from "@/features/pricing/types";
import {pricingUpdateSchema, type PricingUpdateInput} from "@/features/pricing/validation";

export class PricingConfigurationError extends Error {
  constructor() { super("PRICING_NOT_INITIALISED"); }
}

export async function getPricingBook(): Promise<PricingBook> {
  const database = getDb();
  const [treatmentRows, deliveryRows] = await Promise.all([
    database.select().from(treatmentReferencePrice),
    database.select().from(deliveryReferencePrice),
  ]);

  const treatments = Object.fromEntries(referenceTreatments.map((treatment) => [
    treatment,
    Object.fromEntries(treatmentRows.filter((row) => row.treatment === treatment).map((row) => [row.monthStart, row.pricePence])),
  ]));
  const delivery = Object.fromEntries(deliveryRows.map((row) => [row.method, row.pricePence]));
  const parsed = pricingUpdateSchema.safeParse({treatments, delivery});
  if (!parsed.success) throw new PricingConfigurationError();

  const timestamps = [...treatmentRows, ...deliveryRows].map((row) => row.updatedAt.getTime());
  return {...parsed.data, updatedAt: new Date(Math.max(...timestamps)).toISOString()};
}

export async function getPricingManagementData() {
  const pricing = await getPricingBook();
  return {pricing, scenarios: buildPricingScenarios(pricing)};
}

export async function updatePricing(adminId: string, input: PricingUpdateInput) {
  const database = getDb();
  const updatedAt = new Date();
  await database.transaction(async (transaction) => {
    for (const treatment of referenceTreatments) {
      for (const month of referenceMonthTiers) {
        const [updated] = await transaction.update(treatmentReferencePrice).set({
          pricePence: input.treatments[treatment][month], updatedAt, updatedByAdminId: adminId,
        }).where(and(
          eq(treatmentReferencePrice.treatment, treatment as ReferenceTreatment),
          eq(treatmentReferencePrice.monthStart, month as ReferenceMonthTier),
        )).returning({treatment: treatmentReferencePrice.treatment});
        if (!updated) throw new PricingConfigurationError();
      }
    }
    for (const method of referenceDeliveryMethods) {
      const [updated] = await transaction.update(deliveryReferencePrice).set({
        pricePence: input.delivery[method], updatedAt, updatedByAdminId: adminId,
      }).where(eq(deliveryReferencePrice.method, method as ReferenceDeliveryMethod)).returning({method: deliveryReferencePrice.method});
      if (!updated) throw new PricingConfigurationError();
    }
  });
  return getPricingManagementData();
}
