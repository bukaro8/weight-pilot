import "server-only";

import {
  defaultReferenceDuration,
  referenceDeliveryMethods,
  referenceDurations,
  referenceTreatments,
  type EditablePricing,
  type PricingScenarios,
  type ReferenceCostBreakdown,
  type ReferenceDeliveryMethod,
  type ReferenceDuration,
  type ReferenceMonthTier,
  type ReferenceTreatment,
} from "@/features/pricing/types";

export function calculateReferenceCost(
  pricing: EditablePricing,
  treatment: ReferenceTreatment,
  deliveryMethod: ReferenceDeliveryMethod,
  durationMonths: ReferenceDuration = defaultReferenceDuration,
): ReferenceCostBreakdown {
  let treatmentCostPence = 0;
  for (let month = 1; month <= durationMonths; month += 1) {
    const tier = Math.min(month, 5) as ReferenceMonthTier;
    treatmentCostPence += pricing.treatments[treatment][tier];
  }
  const deliveryCostPence = pricing.delivery[deliveryMethod] * durationMonths;
  return {
    durationMonths,
    treatment,
    deliveryMethod,
    treatmentCostPence,
    deliveryCostPence,
    totalCostPence: treatmentCostPence + deliveryCostPence,
  };
}

export function buildPricingScenarios(pricing: EditablePricing): PricingScenarios {
  return Object.fromEntries(referenceDurations.map((duration) => [duration, Object.fromEntries(
    referenceTreatments.map((treatment) => [treatment, Object.fromEntries(
      referenceDeliveryMethods.map((delivery) => [delivery, calculateReferenceCost(pricing, treatment, delivery, duration)]),
    )]),
  )])) as PricingScenarios;
}
