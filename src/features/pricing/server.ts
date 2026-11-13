import "server-only";

import {and, asc, eq} from "drizzle-orm";

import {deliveryReferencePrice, pharmacyReferencePrice, pharmacyReferenceSource, treatmentReferencePrice, treatmentStrengthPrice} from "@/db/schema";
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
import {pharmacyReferenceUpdateSchema, pricingUpdateSchema, type PharmacyReferenceUpdateInput, type PricingUpdateInput} from "@/features/pricing/validation";
import {strengthPriceUpdateSchema} from "@/features/pricing/validation";
import {approvedStrengths} from "@/features/treatments/validation";

export class PricingConfigurationError extends Error {
  constructor() { super("PRICING_NOT_INITIALISED"); }
}

// Report comparisons exclude delivery, so they require only treatment tiers.
export async function getTreatmentPricing() {
  const rows = await getDb().select().from(treatmentReferencePrice);
  const treatments = Object.fromEntries(referenceTreatments.map((treatment) => [
    treatment,
    Object.fromEntries(rows.filter((row) => row.treatment === treatment).map((row) => [row.monthStart, row.pricePence])),
  ]));
  const parsed = pricingUpdateSchema.shape.treatments.safeParse(treatments);
  if (!parsed.success) throw new PricingConfigurationError();
  return {treatments: parsed.data};
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
  const pharmacyReferences = await getPharmacyReferenceData();
  return {pricing, scenarios: buildPricingScenarios(pricing), pharmacyReferences, strengthPrices: await getStrengthPrices()};
}

export async function getStrengthPrices() {
  const rows = await getDb().select().from(treatmentStrengthPrice);
  return referenceTreatments.flatMap((treatment) => approvedStrengths[treatment].map((strength) => {
    const row = rows.find((item) => item.treatment === treatment && item.strength === strength);
    return {treatment, strength, pricePence: row?.pricePence ?? null, updatedAt: row?.updatedAt.toISOString() ?? null};
  }));
}

export async function updateStrengthPrices(adminId: string, input: unknown) {
  const parsed = strengthPriceUpdateSchema.parse(input);
  const expected = referenceTreatments.flatMap((treatment) => approvedStrengths[treatment].map((strength) => `${treatment}:${strength}`));
  const supplied = parsed.prices.map((price) => `${price.treatment}:${price.strength}`);
  if (new Set(supplied).size !== expected.length || expected.some((key) => !supplied.includes(key))) throw new PricingConfigurationError();
  await getDb().transaction(async (tx) => {
    for (const price of parsed.prices) {
      if (price.pricePence === null) {
        await tx.delete(treatmentStrengthPrice).where(and(eq(treatmentStrengthPrice.treatment, price.treatment), eq(treatmentStrengthPrice.strength, price.strength)));
      } else {
        await tx.insert(treatmentStrengthPrice).values({...price, pricePence: price.pricePence, updatedByAdminId: adminId}).onConflictDoUpdate({
          target: [treatmentStrengthPrice.treatment, treatmentStrengthPrice.strength],
          set: {pricePence: price.pricePence, updatedAt: new Date(), updatedByAdminId: adminId},
        });
      }
    }
  });
  return getStrengthPrices();
}

export async function getPharmacyReferenceData() {
  const database = getDb();
  const [source] = await database.select().from(pharmacyReferenceSource).limit(1);
  if (!source) throw new PricingConfigurationError();
  const prices = await database.select({id: pharmacyReferencePrice.id, treatment: pharmacyReferencePrice.treatment, strength: pharmacyReferencePrice.strength, periodMonths: pharmacyReferencePrice.periodMonths, pricePence: pharmacyReferencePrice.pricePence})
    .from(pharmacyReferencePrice).where(eq(pharmacyReferencePrice.sourceId, source.id)).orderBy(asc(pharmacyReferencePrice.treatment));
  prices.sort((left, right) => left.treatment.localeCompare(right.treatment) || Number.parseFloat(left.strength) - Number.parseFloat(right.strength));
  return {source: {id: source.id, name: source.name, url: source.url, referenceDate: source.referenceDate, updatedAt: source.updatedAt.toISOString()}, prices};
}

export async function updatePharmacyReferenceData(adminId: string, input: PharmacyReferenceUpdateInput) {
  const database = getDb();
  const normalized = pharmacyReferenceUpdateSchema.parse(input);
  const now = new Date();
  await database.transaction(async (transaction) => {
    const [source] = await transaction.select({id: pharmacyReferenceSource.id}).from(pharmacyReferenceSource).where(eq(pharmacyReferenceSource.id, normalized.source.id)).limit(1).for("update");
    if (!source) throw new PricingConfigurationError();
    const existing = await transaction.select({id: pharmacyReferencePrice.id}).from(pharmacyReferencePrice).where(eq(pharmacyReferencePrice.sourceId, source.id));
    if (existing.length !== normalized.prices.length || existing.some((row) => !normalized.prices.some((price) => price.id === row.id))) throw new PricingConfigurationError();
    await transaction.update(pharmacyReferenceSource).set({name: normalized.source.name, url: normalized.source.url, referenceDate: normalized.source.referenceDate, updatedAt: now, updatedByAdminId: adminId}).where(eq(pharmacyReferenceSource.id, source.id));
    for (const price of normalized.prices) await transaction.update(pharmacyReferencePrice).set({pricePence: price.pricePence, updatedAt: now, updatedByAdminId: adminId}).where(and(eq(pharmacyReferencePrice.id, price.id), eq(pharmacyReferencePrice.sourceId, source.id)));
  });
  return getPharmacyReferenceData();
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
