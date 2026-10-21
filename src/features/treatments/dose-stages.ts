import type {ReferenceMonthTier} from "@/features/pricing/types";
import type {Treatment} from "./presentation";

// An illustrative display mapping, never an individual dose or progression rule.
// Price tier 5 is a monthly pricing convention shared by later stages.
export type CatalogueDoseStage = {
  period: "MONTH_1" | "MONTH_2" | "MONTH_3" | "MONTH_4" | "MONTH_5" | "MONTH_5_PLUS" | "MONTH_6_PLUS";
  strength: string;
  priceTier: ReferenceMonthTier;
};

export const catalogueDoseStages: Record<Treatment, readonly CatalogueDoseStage[]> = {
  SEMAGLUTIDE: [
    {period: "MONTH_1", strength: "0.25 mg", priceTier: 1},
    {period: "MONTH_2", strength: "0.5 mg", priceTier: 2},
    {period: "MONTH_3", strength: "1 mg", priceTier: 3},
    {period: "MONTH_4", strength: "1.7 mg", priceTier: 4},
    {period: "MONTH_5_PLUS", strength: "2.4 mg", priceTier: 5},
  ],
  TIRZEPATIDE: [
    {period: "MONTH_1", strength: "2.5 mg", priceTier: 1},
    {period: "MONTH_2", strength: "5 mg", priceTier: 2},
    {period: "MONTH_3", strength: "7.5 mg", priceTier: 3},
    {period: "MONTH_4", strength: "10 mg", priceTier: 4},
    {period: "MONTH_5", strength: "12.5 mg", priceTier: 5},
    {period: "MONTH_6_PLUS", strength: "15 mg", priceTier: 5},
  ],
};

export function catalogueDosePriceRows(treatment: Treatment, prices: Record<ReferenceMonthTier, number>) {
  return catalogueDoseStages[treatment].map((stage) => ({...stage, pricePence: prices[stage.priceTier]}));
}
