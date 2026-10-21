import assert from "node:assert/strict";
import test from "node:test";

import {evaluateAssessmentDecision} from "../src/features/assessment/decision.ts";
import {getFirstName} from "../src/features/auth/name.ts";

const complete = {
  status: "SUBMITTED",
  age: 42,
  sexAssignedAtBirth: "FEMALE",
  heightCm: 165,
  currentWeightKg: 100,
  targetWeightKg: 80,
  healthConditions: ["NONE"],
  medications: null,
  noMedication: true,
};

test("an uncomplicated evidence-matching profile identifies one treatment to discuss", () => {
  assert.deepEqual(evaluateAssessmentDecision(complete), {
    status: "DISCUSS_TREATMENT",
    treatmentToDiscuss: "TIRZEPATIDE",
    reasons: [],
  });
});

test("a disclosed condition requires review and names no treatment", () => {
  const decision = evaluateAssessmentDecision({...complete, healthConditions: ["DIABETES"]});
  assert.equal(decision.status, "REVIEW_REQUIRED");
  assert.equal(decision.treatmentToDiscuss, null);
  assert.deepEqual(decision.reasons, ["HEALTH_CONDITION_SELECTED"]);
});

test("current medication requires review and names no treatment", () => {
  const decision = evaluateAssessmentDecision({...complete, medications: "Example medicine", noMedication: false});
  assert.equal(decision.status, "REVIEW_REQUIRED");
  assert.equal(decision.treatmentToDiscuss, null);
  assert.deepEqual(decision.reasons, ["CURRENT_MEDICATION"]);
});

test("uncertain health information requires review", () => {
  assert.deepEqual(evaluateAssessmentDecision({...complete, healthConditions: ["NOT_SURE"]}).reasons, ["HEALTH_STATUS_UNCERTAIN"]);
});

test("incomplete or inconsistent answers require review", () => {
  assert.deepEqual(evaluateAssessmentDecision({...complete, currentWeightKg: null}).reasons, ["INCOMPLETE_OR_INCONSISTENT"]);
  assert.deepEqual(evaluateAssessmentDecision({...complete, medications: "Conflict"}).reasons, ["INCOMPLETE_OR_INCONSISTENT"]);
  assert.deepEqual(evaluateAssessmentDecision({...complete, status: "DRAFT"}).reasons, ["INCOMPLETE_OR_INCONSISTENT"]);
});

test("target percentage alone does not force a treatment choice", () => {
  const smallerTarget = evaluateAssessmentDecision({...complete, targetWeightKg: 90});
  const evidenceRangeTarget = evaluateAssessmentDecision({...complete, targetWeightKg: 80});
  const higherTarget = evaluateAssessmentDecision({...complete, targetWeightKg: 70});
  assert.deepEqual(smallerTarget, {status: "REVIEW_REQUIRED", treatmentToDiscuss: null, reasons: ["NO_DEFENSIBLE_DISTINCTION"]});
  assert.equal(evidenceRangeTarget.treatmentToDiscuss, "TIRZEPATIDE");
  assert.deepEqual(higherTarget, {status: "REVIEW_REQUIRED", treatmentToDiscuss: null, reasons: ["NO_DEFENSIBLE_DISTINCTION"]});
});

test("registered full names produce a safe first-name greeting", () => {
  assert.equal(getFirstName("  María   del Mar  "), "María");
  assert.equal(getFirstName("Alex"), "Alex");
});
