import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {canBrowseTreatments, canChangeRequestStatus} from "../src/features/treatments/policy.ts";
import {createTreatmentRequestSchema, updateTreatmentRequestSchema} from "../src/features/treatments/validation.ts";
import {treatmentFromPath, treatmentItems} from "../src/features/treatments/presentation.ts";
import {renderTreatmentRequestNotification} from "../src/features/treatments/email-template.ts";
import {catalogueDosePriceRows, catalogueDoseStages} from "../src/features/treatments/dose-stages.ts";

const eligible = {role: "USER", status: "ACTIVE", emailVerified: true};
const request = {clientRequestId: "a8e8b6b2-6401-45cc-9b77-99517e0a37d1", reportId: "8479dca7-6810-4efb-bd27-069c49417286", treatment: "SEMAGLUTIDE", fullName: "Alex Example", address: "1 Example Road, London", postcode: "SW1A 1AA", telephone: "+44 7700 900123", language: "en"};

test("catalogue requires verified active USER and an available report", () => {
  assert.equal(canBrowseTreatments(eligible, true), true);
  for (const account of [{...eligible, role: "ADMIN"}, {...eligible, status: "INACTIVE"}, {...eligible, emailVerified: false}]) assert.equal(canBrowseTreatments(account, true), false);
  assert.equal(canBrowseTreatments(eligible, false), false);
});

test("only two generic treatments are routable", () => {
  assert.deepEqual(treatmentItems, ["SEMAGLUTIDE", "TIRZEPATIDE"]);
  assert.equal(treatmentFromPath("retatrutide"), null);
});

test("illustrative dose labels map to configured tiers without treating tiers as strengths", () => {
  const semaglutide = catalogueDosePriceRows("SEMAGLUTIDE", {1: 3200, 2: 4600, 3: 6000, 4: 7000, 5: 7500});
  const tirzepatide = catalogueDosePriceRows("TIRZEPATIDE", {1: 5500, 2: 7500, 3: 10000, 4: 11500, 5: 12000});
  assert.deepEqual(semaglutide.map(({strength, priceTier}) => [strength, priceTier]), [["0.25 mg", 1], ["0.5 mg", 2], ["1 mg", 3], ["1.7 mg", 4], ["2.4 mg", 5]]);
  assert.deepEqual(tirzepatide.map(({strength, priceTier}) => [strength, priceTier]), [["2.5 mg", 1], ["5 mg", 2], ["7.5 mg", 3], ["10 mg", 4], ["12.5 mg", 5], ["15 mg", 5]]);
  assert.equal(tirzepatide[4].pricePence, 12000);
  assert.equal(tirzepatide[5].pricePence, 12000);
  assert.equal(catalogueDoseStages.TIRZEPATIDE[5].period, "MONTH_6_PLUS");
  assert.equal(catalogueDosePriceRows("TIRZEPATIDE", {1: 1, 2: 2, 3: 3, 4: 4, 5: 999})[5].pricePence, 999);
});

test("request validation accepts both languages and rejects malformed contact data", () => {
  assert.equal(createTreatmentRequestSchema.safeParse(request).success, true);
  assert.equal(createTreatmentRequestSchema.safeParse({...request, language: "es", treatment: "TIRZEPATIDE"}).success, true);
  assert.equal(createTreatmentRequestSchema.safeParse({...request, telephone: "abc"}).success, false);
  assert.equal(createTreatmentRequestSchema.safeParse({...request, message: "x".repeat(1001)}).success, false);
  assert.equal(createTreatmentRequestSchema.safeParse({...request, role: "ADMIN"}).success, false);
});

test("status transitions are restricted and declining requires a reason", () => {
  assert.equal(canChangeRequestStatus("SUBMITTED", "APPROVED_FOR_NEXT_STEPS"), false);
  assert.equal(canChangeRequestStatus("UNDER_REVIEW", "APPROVED_FOR_NEXT_STEPS"), true);
  assert.equal(canChangeRequestStatus("APPROVED_FOR_NEXT_STEPS", "UNDER_REVIEW"), false);
  assert.equal(updateTreatmentRequestSchema.safeParse({status: "DECLINED", internalNote: "", declineReason: ""}).success, false);
  assert.equal(updateTreatmentRequestSchema.safeParse({status: "DECLINED", internalNote: "", declineReason: "Information incomplete"}).success, true);
});

test("EN and ES treatment keys match", () => {
  const en = JSON.parse(readFileSync(new URL("../src/messages/treatments/en.json", import.meta.url)));
  const es = JSON.parse(readFileSync(new URL("../src/messages/treatments/es.json", import.meta.url)));
  assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
});

test("notifications are bilingual, generic and contain only a secure request link", () => {
  const en = renderTreatmentRequestNotification({language: "en", target: "admin", url: "https://weightpilot.uk/en/admin/treatment-requests/example"});
  const es = renderTreatmentRequestNotification({language: "es", target: "member", url: "https://weightpilot.uk/es/requests/example"});
  assert.match(en.html, /New WeightPilot request/);
  assert.match(es.html, /Actualización de tu solicitud/);
  assert.doesNotMatch(en.html + es.html, /questionnaire|medicine|address|telephone/i);
});

test("migration preserves idempotency, ownership and request history", () => {
  const migration = readFileSync(new URL("../drizzle/0015_black_king_bedlam.sql", import.meta.url), "utf8");
  assert.match(migration, /treatment_access_request_member_client_uidx/);
  assert.match(migration, /treatment_request_status_event/);
  assert.match(migration, /ON DELETE cascade/);
});
