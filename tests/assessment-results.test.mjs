import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

test("review requests require a supported report language", () => {
  return readFile(new URL("../src/features/assessment/validation.ts", import.meta.url), "utf8").then((source) => {
    assert.match(source, /reportLanguage: z\.enum\(\["en", "es"\]\)/u);
    assert.match(source, /\.strict\(\)/u);
  });
});

test("member results do not load or render pricing data", async () => {
  const [page, component] = await Promise.all([
    readFile(new URL("../src/app/[locale]/(member)/consultations/results/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/assessment/treatment-results.tsx", import.meta.url), "utf8"),
  ]);
  assert.equal(page.includes("@/features/pricing"), false);
  assert.equal(component.includes("PricingScenarios"), false);
  assert.equal(component.includes("deliveryCostPence"), false);
  assert.equal(component.includes("totalCostPence"), false);
});

test("administrator pricing calculations remain available and unchanged", () => {
  return readFile(new URL("../src/features/pricing/calculations.ts", import.meta.url), "utf8").then((source) => {
    assert.match(source, /export function calculateReferenceCost/u);
    assert.match(source, /pricing\.delivery\[deliveryMethod\] \* durationMonths/u);
    assert.match(source, /totalCostPence: treatmentCostPence \+ deliveryCostPence/u);
  });
});
