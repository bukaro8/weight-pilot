import type {EditablePricing, PharmacyReferenceData, ReferenceTreatment} from "@/features/pricing/types";

export const comparisonMonths = 16 as const;

export function resolveComparisonTreatment(recommended: "SEMAGLUTIDE" | "TIRZEPATIDE" | "REVIEW_REQUIRED", hypothetical: "SEMAGLUTIDE" | "TIRZEPATIDE" | null) {
  return recommended === "REVIEW_REQUIRED" ? hypothetical : recommended;
}

const titration = {
  SEMAGLUTIDE: ["0.25 mg", "0.5 mg", "1 mg", "1.7 mg", ...Array.from({length: 12}, () => "2.4 mg")],
  TIRZEPATIDE: ["2.5 mg", "5 mg", "7.5 mg", "10 mg", "12.5 mg", ...Array.from({length: 11}, () => "15 mg")],
} as const;

export type SavingsComparisonMonth = {
  month: number;
  strength: string;
  weightPilotPricePence: number;
  pharmacyPricePence: number;
};

export type SavingsComparisonSnapshot = {
  treatment: ReferenceTreatment;
  hypothetical: boolean;
  durationMonths: 16;
  weightPilotTreatmentCostPence: number;
  pharmacyTreatmentCostPence: number;
  differencePence: number;
  percentageLower: number;
  sourceName: string;
  sourceUrl: string;
  sourceReferenceDate: string;
  months: SavingsComparisonMonth[];
};

export function buildSavingsComparison(input: {
  treatment: ReferenceTreatment;
  hypothetical?: boolean;
  pricing: Pick<EditablePricing, "treatments">;
  pharmacy: PharmacyReferenceData;
}): SavingsComparisonSnapshot | null {
  const strengths = titration[input.treatment];
  if (getMissingPharmacyReferenceStrengths(input.treatment, input.pharmacy).length) return null;
  const months = strengths.map((strength, index) => {
    const reference = input.pharmacy.prices.find((price) =>
      price.treatment === input.treatment && normalizeStrength(price.strength) === normalizeStrength(strength) && price.periodMonths === 1);
    if (!reference || reference.pricePence <= 0) return null;
    const tier = Math.min(index + 1, 5) as 1 | 2 | 3 | 4 | 5;
    return {month: index + 1, strength, weightPilotPricePence: input.pricing.treatments[input.treatment][tier], pharmacyPricePence: reference.pricePence};
  });
  if (months.some((month) => month === null)) return null;
  const completeMonths = months as SavingsComparisonMonth[];
  const weightPilotTreatmentCostPence = completeMonths.reduce((total, month) => total + month.weightPilotPricePence, 0);
  const pharmacyTreatmentCostPence = completeMonths.reduce((total, month) => total + month.pharmacyPricePence, 0);
  const differencePence = pharmacyTreatmentCostPence - weightPilotTreatmentCostPence;
  return {
    treatment: input.treatment,
    hypothetical: input.hypothetical ?? false,
    durationMonths: comparisonMonths,
    weightPilotTreatmentCostPence,
    pharmacyTreatmentCostPence,
    differencePence,
    percentageLower: Math.round((differencePence / pharmacyTreatmentCostPence) * 1000) / 10,
    sourceName: input.pharmacy.source.name,
    sourceUrl: input.pharmacy.source.url,
    sourceReferenceDate: input.pharmacy.source.referenceDate,
    months: completeMonths,
  };
}

function normalizeStrength(strength: string) {
  return strength.trim().toLocaleLowerCase("en-GB").replace(/\s+/gu, "");
}

export function getMissingPharmacyReferenceStrengths(treatment: ReferenceTreatment, pharmacy: PharmacyReferenceData) {
  return [...new Set(titration[treatment].filter((strength) => !pharmacy.prices.some((price) =>
    price.treatment === treatment && normalizeStrength(price.strength) === normalizeStrength(strength) && price.periodMonths === 1,
  )))];
}
