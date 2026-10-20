import assert from "node:assert/strict";
import test from "node:test";

import {passwordSchema} from "../src/features/auth/validation.ts";
import {calculateBmi, calculateTargetLossPercentage} from "../src/features/questionnaire/calculations.ts";
import {imperialHeightToCm, imperialWeightToKg, metricHeightToImperial, metricWeightToImperial} from "../src/features/questionnaire/units.ts";

test("password validation rejects 8 characters and accepts 9", () => {
  assert.equal(passwordSchema.safeParse("12345678").success, false);
  assert.equal(passwordSchema.safeParse("123456789").success, true);
});

test("height conversions use canonical centimetres", () => {
  assert.equal(imperialHeightToCm(5, 7), 170.2);
  assert.deepEqual(metricHeightToImperial(170.2), {feet: 5, inches: 7});
});

test("weight conversions use canonical kilograms", () => {
  assert.equal(imperialWeightToKg(12, 4), 78);
  assert.deepEqual(metricWeightToImperial(78), {stones: 12, pounds: 4});
  assert.deepEqual(metricWeightToImperial(imperialWeightToKg(11, 0)), {stones: 11, pounds: 0});
});

test("BMI and target loss calculations remain metric and stable", () => {
  const heightCm = imperialHeightToCm(5, 7);
  const currentKg = imperialWeightToKg(12, 4);
  const targetKg = imperialWeightToKg(11, 0);
  assert.equal(calculateBmi(currentKg, heightCm), 26.9);
  assert.equal(calculateTargetLossPercentage(currentKg, targetKg), 10.4);
});
