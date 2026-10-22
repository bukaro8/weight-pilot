import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {registerHooks} from "node:module";
import {canBrowseTreatments, canChangeRequestStatus} from "../src/features/treatments/policy.ts";
import {createTreatmentRequestSchema, treatmentDecisionSchema} from "../src/features/treatments/validation.ts";
import {formatPenceWithPoundSymbol, treatmentCardHref, treatmentFromPath, treatmentItems} from "../src/features/treatments/presentation.ts";
import {renderTreatmentApprovalEmail, renderTreatmentRequestNotification} from "../src/features/treatments/email-template.ts";
import {catalogueDosePriceRows, catalogueDoseStages} from "../src/features/treatments/dose-stages.ts";
import {getClearTreatmentSuggestion} from "../src/features/reports/content.ts";

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

test("catalogue cards lead to details while report cards keep their report in the request flow", () => {
  assert.equal(treatmentCardHref("SEMAGLUTIDE", "catalogue"), "/treatments/semaglutide");
  assert.equal(treatmentCardHref("TIRZEPATIDE", "report", "report-123"), "/treatments/tirzepatide/request?reportId=report-123");
  assert.equal(formatPenceWithPoundSymbol(3200, "en"), "£32.00");
  assert.equal(formatPenceWithPoundSymbol(3600, "es"), "£36,00");
  for (const language of ["en", "es"]) {
    const copy = JSON.parse(readFileSync(new URL(`../src/messages/treatments/${language}.json`, import.meta.url)));
    assert.match(copy.cardReference, /\{dose\}.*\{price\}/);
    assert.ok(copy.moreInfo && copy.getItNow && copy.getItNowNote);
    const reports = JSON.parse(readFileSync(new URL(`../src/messages/member-area/${language}.json`, import.meta.url))).reports;
    assert.ok(reports.recommendedTitle && reports.moreTreatmentsTitle);
  }
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
  assert.equal(canChangeRequestStatus("SUBMITTED", "APPROVED_FOR_NEXT_STEPS"), true);
  assert.equal(canChangeRequestStatus("UNDER_REVIEW", "APPROVED_FOR_NEXT_STEPS"), true);
  assert.equal(canChangeRequestStatus("APPROVED_FOR_NEXT_STEPS", "UNDER_REVIEW"), false);
  assert.equal(treatmentDecisionSchema.safeParse({status: "DECLINED", internalNote: "", declineReason: "", approvedTreatment: null, approvedStrength: null}).success, false);
  assert.equal(treatmentDecisionSchema.safeParse({status: "DECLINED", internalNote: "", declineReason: "Information incomplete", approvedTreatment: null, approvedStrength: null}).success, true);
  assert.equal(treatmentDecisionSchema.safeParse({status: "APPROVED_FOR_NEXT_STEPS", internalNote: "", declineReason: "", approvedTreatment: "TIRZEPATIDE", approvedStrength: "12.5 mg"}).success, true);
  assert.equal(treatmentDecisionSchema.safeParse({status: "APPROVED_FOR_NEXT_STEPS", internalNote: "", declineReason: "", approvedTreatment: "TIRZEPATIDE", approvedStrength: "17.5 mg"}).success, false);
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

test("approval emails are bilingual, include configured or fallback payment details and private messaging", () => {
  const en = renderTreatmentApprovalEmail({language: "en", memberName: "A. Member", treatment: "TIRZEPATIDE", strength: "12.5 mg", messagesUrl: "https://weightpilot.uk/en/messages"});
  const es = renderTreatmentApprovalEmail({language: "es", memberName: "A. Member", treatment: "SEMAGLUTIDE", strength: "1.7 mg", messagesUrl: "https://weightpilot.uk/es/messages", accountName: "WeightPilot", accountNumber: "12345678", sortCode: "11 22 33"});
  assert.match(en.html, /Your request has been approved for next steps/);
  assert.match(en.html, /0000000/);
  assert.match(en.html, /00 00 00/);
  assert.match(en.html, /XXXX/);
  assert.match(en.html, /12\.5 mg/);
  assert.match(en.html, /https:\/\/weightpilot\.uk\/en\/messages/);
  assert.match(es.html, /Tu solicitud se ha aprobado/);
  assert.match(es.html, /11 22 33/);
  assert.match(es.html, /12345678/);
  assert.match(es.html, /https:\/\/weightpilot\.uk\/es\/messages/);
  assert.match(en.html, /not a prescription/i);
});

test("approval email uses the verified account recipient and a stable idempotency key without live delivery", async () => {
  registerHooks({resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return {url: "data:text/javascript,export%20default%20undefined", shortCircuit: true};
    if (specifier === "resend") return {url: `data:text/javascript,${encodeURIComponent("export class Resend { constructor() { this.emails = {send: async (...args) => { globalThis.__treatmentMailCalls.push(args); return globalThis.__treatmentMailResult; }}; }}")}`, shortCircuit: true};
    if (specifier === "./email-template") return nextResolve(new URL("../src/features/treatments/email-template.ts", import.meta.url).href, context);
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    return nextResolve(specifier, context);
  }});
  const {sendTreatmentApprovalEmail} = await import("../src/features/treatments/email.ts");
  const env = Object.fromEntries(["RESEND_API_KEY", "EMAIL_FROM", "PUBLIC_APP_URL", "ACCOUNT_NAME", "ACCOUNT_NUMBER", "SORT_CODE"].map((key) => [key, process.env[key]]));
  Object.assign(process.env, {RESEND_API_KEY: "test-key", EMAIL_FROM: "sender@example.invalid", PUBLIC_APP_URL: "https://weightpilot.uk"});
  globalThis.__treatmentMailCalls = [];
  globalThis.__treatmentMailResult = {data: {id: "resend-message-id"}, error: null};
  try {
    const result = await sendTreatmentApprovalEmail({id: "request-123", language: "en", recipient: "verified@example.invalid", memberName: "Member", treatment: "SEMAGLUTIDE", strength: "1.7 mg"});
    assert.deepEqual(result, {accepted: true, reason: null, providerMessageId: "resend-message-id"});
    assert.equal(globalThis.__treatmentMailCalls[0][0].to, "verified@example.invalid");
    assert.equal(globalThis.__treatmentMailCalls[0][1].idempotencyKey, "weightpilot-treatment-approval-request-123");
    assert.match(globalThis.__treatmentMailCalls[0][0].html, /0000000/);
    const route = readFileSync(new URL("../src/app/api/admin/treatment-requests/[id]/route.ts", import.meta.url), "utf8");
    assert.match(route, /if \(!detail\.emailVerified\)/u);
    assert.match(route, /recipient: detail\.memberEmail/u);
  } finally {
    for (const [key, value] of Object.entries(env)) {if (value === undefined) delete process.env[key]; else process.env[key] = value;}
    delete globalThis.__treatmentMailCalls;
    delete globalThis.__treatmentMailResult;
  }
});

test("report treatment CTA eligibility requires a clear treatment suggestion", () => {
  const clear = JSON.stringify({recommendedTreatment: "SEMAGLUTIDE", confidence: "HIGH", reason: "Evidence supports this option for discussion.", requiresMedicalReview: false});
  const review = JSON.stringify({recommendedTreatment: "REVIEW_REQUIRED", confidence: "INSUFFICIENT_INFORMATION", reason: "Further review is needed.", requiresMedicalReview: true});
  const medicallyUnreviewed = JSON.stringify({recommendedTreatment: "TIRZEPATIDE", confidence: "HIGH", reason: "A comparison supports discussion.", requiresMedicalReview: true});
  assert.equal(getClearTreatmentSuggestion(clear), "SEMAGLUTIDE");
  assert.equal(getClearTreatmentSuggestion(review), null);
  assert.equal(getClearTreatmentSuggestion(medicallyUnreviewed), null);
});

test("migration preserves idempotency, ownership and request history", () => {
  const migration = readFileSync(new URL("../drizzle/0015_black_king_bedlam.sql", import.meta.url), "utf8");
  assert.match(migration, /treatment_access_request_member_client_uidx/);
  assert.match(migration, /treatment_request_status_event/);
  assert.match(migration, /ON DELETE cascade/);
  const decisionMigration = readFileSync(new URL("../drizzle/0016_legal_hellion.sql", import.meta.url), "utf8");
  assert.match(decisionMigration, /approved_treatment/);
  assert.match(decisionMigration, /approved_strength/);
});
