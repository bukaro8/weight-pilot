import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

import {selectDashboardStage} from "../src/features/member-area/dashboard-stage.ts";

const draft = {id: "assessment-1", status: "DRAFT", currentStep: 3};
const submitted = {...draft, status: "SUBMITTED", currentStep: 5};
const report = {id: "report-1", questionnaireId: submitted.id, availableAt: "2026-11-10T10:00:00.000Z"};
const request = {id: "request-1", reportId: report.id, status: "SUBMITTED"};

test("dashboard journey chooses a real next step for new, draft, review, report, and request", () => {
  const base = {assessment: null, reviewStatus: null, report: null, treatmentRequest: null};
  assert.equal(selectDashboardStage(base), "NEW");
  assert.equal(selectDashboardStage({...base, assessment: draft}), "DRAFT");
  assert.equal(selectDashboardStage({...base, assessment: submitted, reviewStatus: "REQUESTED"}), "REVIEW");
  assert.equal(selectDashboardStage({...base, assessment: submitted, reviewStatus: "IN_REVIEW"}), "REVIEW");
  assert.equal(selectDashboardStage({...base, assessment: submitted, reviewStatus: "COMPLETED", report}), "REPORT");
  assert.equal(selectDashboardStage({...base, assessment: submitted, reviewStatus: "COMPLETED", report, treatmentRequest: request}), "REQUEST");
});

test("old reports do not mask a newer assessment, and cancelled requests do not mask the report", () => {
  const base = {assessment: submitted, reviewStatus: "REQUESTED", report, treatmentRequest: request};
  assert.equal(selectDashboardStage({...base, assessment: {id: "assessment-2", status: "DRAFT", currentStep: 2}}), "DRAFT");
  assert.equal(selectDashboardStage({...base, assessment: {id: "assessment-2", status: "SUBMITTED", currentStep: 5}}), "REVIEW");
  assert.equal(selectDashboardStage({...base, treatmentRequest: {...request, status: "CANCELLED"}}), "REPORT");
  assert.equal(selectDashboardStage({...base, treatmentRequest: {...request, reportId: "other-report"}}), "REPORT");
  assert.equal(selectDashboardStage({...base, reviewStatus: null, report: null}), "AWAITING_REVIEW_REQUEST");
});

test("submission creates one review request atomically in the saved member language", async () => {
  const source = await readFile(new URL("../src/features/questionnaire/server.ts", import.meta.url), "utf8");
  assert.match(source, /getDb\(\)\.transaction\(async \(transaction\) => \{/u);
  assert.match(source, /reportLanguage: owner\.preferredLanguage/u);
  assert.match(source, /onConflictDoNothing\(\{target: questionnaireReviewRequest\.questionnaireId\}\)/u);
  const reviewSource = await readFile(new URL("../src/features/assessment/server.ts", import.meta.url), "utf8");
  assert.match(reviewSource, /existing\?\.status === "REQUESTED"/u);
  assert.match(reviewSource, /set\(\{reportLanguage, updatedAt: new Date\(\)\}\)/u);
});

test("journey translations have matching EN and ES keys", async () => {
  const [en, es] = await Promise.all(["en", "es"].map(async (locale) => {
    const source = await readFile(new URL(`../src/messages/member-area/${locale}.json`, import.meta.url), "utf8");
    return JSON.parse(source).dashboardJourney;
  }));
  const keys = (value, prefix = "") => Object.entries(value).flatMap(([key, entry]) =>
    entry && typeof entry === "object" ? keys(entry, `${prefix}${key}.`) : [`${prefix}${key}`]);
  assert.deepEqual(keys(en).sort(), keys(es).sort());
});
