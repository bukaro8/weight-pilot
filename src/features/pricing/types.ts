export const referenceTreatments = ["SEMAGLUTIDE", "TIRZEPATIDE"] as const;
export const referenceDeliveryMethods = ["STANDARD_NEXT_DAY", "GUARANTEED_NEXT_DAY"] as const;
export const referenceMonthTiers = [1, 2, 3, 4, 5] as const;
export const referenceDurations = [6, 12, 16] as const;
export const defaultReferenceDuration = 16 as const;

export type ReferenceTreatment = typeof referenceTreatments[number];
export type ReferenceDeliveryMethod = typeof referenceDeliveryMethods[number];
export type ReferenceMonthTier = typeof referenceMonthTiers[number];
export type ReferenceDuration = typeof referenceDurations[number];

export type EditablePricing = {
  treatments: Record<ReferenceTreatment, Record<ReferenceMonthTier, number>>;
  delivery: Record<ReferenceDeliveryMethod, number>;
};

export type PricingBook = EditablePricing & {updatedAt: string};

export type ReferenceCostBreakdown = {
  durationMonths: ReferenceDuration;
  treatment: ReferenceTreatment;
  deliveryMethod: ReferenceDeliveryMethod;
  treatmentCostPence: number;
  deliveryCostPence: number;
  totalCostPence: number;
};

export type PricingScenarios = Record<ReferenceDuration, Record<ReferenceTreatment, Record<ReferenceDeliveryMethod, ReferenceCostBreakdown>>>;

export type PharmacyReferencePrice = {id: string; treatment: ReferenceTreatment; strength: string; periodMonths: number; pricePence: number};
export type PharmacyReferenceData = {
  source: {id: string; name: string; url: string; referenceDate: string; updatedAt: string};
  prices: PharmacyReferencePrice[];
};
