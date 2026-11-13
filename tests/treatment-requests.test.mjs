import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {registerHooks} from "node:module";
import {canBrowseTreatments, canChangeRequestStatus} from "../src/features/treatments/policy.ts";
import {createTreatmentRequestSchema, normaliseUkPostcode, paymentAuthorisationSchema, treatmentCommunicationSchema, treatmentDecisionSchema} from "../src/features/treatments/validation.ts";
import {formatPenceWithPoundSymbol, treatmentCardHref, treatmentFromPath, treatmentItems} from "../src/features/treatments/presentation.ts";

import {catalogueDosePriceRows, catalogueDoseStages} from "../src/features/treatments/dose-stages.ts";
import {getClearTreatmentSuggestion} from "../src/features/reports/content.ts";

const eligible = {role: "USER", status: "ACTIVE", emailVerified: true};
const request = {clientRequestId: "a8e8b6b2-6401-45cc-9b77-99517e0a37d1", reportId: "8479dca7-6810-4efb-bd27-069c49417286", treatment: "SEMAGLUTIDE", fullName: "Alex Example", streetAddress: "24 King Street", flatNumber: "Flat 3B", buildingName: "Rose Court", city: "Manchester", postcode: "M1 1AE", telephone: "+44 7700 900123", language: "en"};
registerHooks({resolve(specifier, context, nextResolve) {
  if (specifier === "@/features/email/notice") return nextResolve(new URL("../src/features/email/notice.ts", import.meta.url).href, context);
  return nextResolve(specifier, context);
}});
const {renderTreatmentApprovalEmail, renderTreatmentPaymentEmail, renderTreatmentRequestNotification, renderTreatmentUpdateEmail} = await import("../src/features/treatments/email-template.ts");
const {calculatePaymentSnapshot, paymentEnvironmentConfigured} = await import("../src/features/treatments/payment.ts");

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
  assert.equal(createTreatmentRequestSchema.safeParse({...request, flatNumber: "", buildingName: ""}).success, true);
  assert.equal(createTreatmentRequestSchema.safeParse({...request, telephone: "abc"}).success, false);
  assert.equal(createTreatmentRequestSchema.safeParse({...request, telephone: "1234567890"}).success, false);
  assert.equal(createTreatmentRequestSchema.safeParse({...request, telephone: "00000 000000"}).success, false);
  assert.equal(createTreatmentRequestSchema.safeParse({...request, postcode: "ABC 123"}).success, false);
  assert.equal(createTreatmentRequestSchema.safeParse({...request, city: ""}).success, false);
  assert.equal(createTreatmentRequestSchema.safeParse({...request, streetAddress: ""}).success, false);
  assert.equal(createTreatmentRequestSchema.safeParse({...request, message: "Hello"}).success, false);
  assert.equal(createTreatmentRequestSchema.safeParse({...request, role: "ADMIN"}).success, false);
  assert.equal(normaliseUkPostcode("sw1a1aa"), "SW1A 1AA");
  assert.equal(createTreatmentRequestSchema.parse({...request, postcode: "sw1a1aa"}).postcode, "SW1A 1AA");
});

test("the request form is a single-step bilingual address form with an exact Order now action", () => {
  const form = readFileSync(new URL("../src/components/treatments/request-form.tsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../src/app/[locale]/(member)/treatments/[treatment]/request/page.tsx", import.meta.url), "utf8");
  const en = JSON.parse(readFileSync(new URL("../src/messages/treatments/en.json", import.meta.url)));
  const es = JSON.parse(readFileSync(new URL("../src/messages/treatments/es.json", import.meta.url)));
  assert.equal(en.orderNow, "Order now");
  assert.equal(es.orderNow, "Ordenar ahora");
  assert.equal(en.requestTitle, "Request {treatmentName}");
  assert.equal(es.requestTitle, "Solicitar {treatmentName}");
  assert.match(form, /t\("whatNextTitle"\)/u);
  assert.match(form, /t\("whatNextMessage"\)/u);
  assert.match(form, /t\("whatNextSecondary"\)/u);
  assert.match(form, /t\("requestReceivedTitle"\)/u);
  assert.match(form, /t\("orderNow"\)/u);
  assert.doesNotMatch(form, /optionalMessage|textarea|reviewing/u);
  assert.match(page, /getLatestMemberDeliveryDetails\(member\.id\)/u);
  assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
});

test("structured fields persist while historical address and message remain readable", () => {
  const migration = readFileSync(new URL("../drizzle/0021_legal_ser_duncan.sql", import.meta.url), "utf8");
  const server = readFileSync(new URL("../src/features/treatments/server.ts", import.meta.url), "utf8");
  const admin = readFileSync(new URL("../src/app/[locale]/(admin)/admin/treatment-requests/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(migration, /ADD COLUMN "street_address" text/u);
  assert.match(migration, /ADD COLUMN "flat_number" text/u);
  assert.match(migration, /ADD COLUMN "building_name" text/u);
  assert.match(migration, /ADD COLUMN "city" text/u);
  assert.doesNotMatch(migration, /DROP|DELETE|UPDATE/u);
  assert.match(server, /address, message: null/u);
  assert.match(server, /onConflictDoNothing\(\)/u);
  assert.match(admin, /request\.streetAddress \? "streetAddress" : "address"/u);
  assert.match(admin, /request\.message \?/u);
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
  const receiptEn = renderTreatmentRequestNotification({language: "en", target: "member", event: "created", url: "https://weightpilot.uk/en/requests/example"});
  const receiptEs = renderTreatmentRequestNotification({language: "es", target: "member", event: "created", url: "https://weightpilot.uk/es/requests/example"});
  assert.match(en.html, /New WeightPilot request/);
  assert.match(es.html, /Actualización de tu solicitud/);
  assert.match(receiptEn.subject, /received your WeightPilot request/u);
  assert.match(receiptEs.subject, /recibido tu solicitud/u);
  assert.match(receiptEn.html, /does not confirm a purchase/u);
  assert.match(receiptEs.html, /no confirma una compra/u);
  assert.match(en.html, /This email is not monitored/u);
  assert.match(es.html, /Este correo no se supervisa/u);
  assert.doesNotMatch(en.html + es.html, /questionnaire|medicine|address|telephone/i);
  const route = readFileSync(new URL("../src/app/api/treatment-requests/route.ts", import.meta.url), "utf8");
  assert.match(route, /recipient: member\.email, target: "member", event: "created"/u);
});

test("approval notices are bilingual and contain no payment request", () => {
  const en = renderTreatmentApprovalEmail({language: "en", memberName: "A. Member", treatment: "TIRZEPATIDE", strength: "12.5 mg", messagesUrl: "https://weightpilot.uk/en/messages"});
  const es = renderTreatmentApprovalEmail({language: "es", memberName: "A. Member", treatment: "SEMAGLUTIDE", strength: "1.7 mg", messagesUrl: "https://weightpilot.uk/es/messages"});
  assert.match(en.html, /Your request has been approved for next steps/);
  assert.match(es.html, /Tu solicitud se ha aprobado/);
  assert.match(en.html, /No payment is due/);
  assert.match(es.html, /no requiere ningún pago/);
  assert.doesNotMatch(en.html + es.html, /0000000|00 00 00|bank transfer|transferencia bancaria/i);
  assert.match(en.html, /not a prescription/i);
});

test("payment uses exact approved strength price and freezes 480 pence delivery", () => {
  const snapshot = calculatePaymentSnapshot({treatment: "TIRZEPATIDE", strength: "5 mg", pricePence: 7500});
  assert.deepEqual(snapshot, {treatment: "TIRZEPATIDE", strength: "5 mg", itemPricePence: 7500, deliveryPricePence: 480, totalPence: 7980});
  assert.throws(() => calculatePaymentSnapshot({treatment: "TIRZEPATIDE", strength: "12.5 mg", pricePence: null}), /STRENGTH_PRICE_MISSING/);
  assert.equal(paymentEnvironmentConfigured({accountName: "XXXX", sortCode: "00 00 00", accountNumber: "0000000"}), false);
  assert.equal(paymentEnvironmentConfigured({accountName: "Example Account", sortCode: "12 34 56", accountNumber: "12345678"}), true);
});

test("payment requires two explicit authorisation confirmations and references", () => {
  const valid = {treatment: "TIRZEPATIDE", strength: "5 mg", prescriptionReference: "RX-2026-123", supplyAuthorisationReference: "SUP-2026-123", prescribingVerified: true, supplyVerified: true};
  assert.equal(paymentAuthorisationSchema.safeParse(valid).success, true);
  assert.equal(paymentAuthorisationSchema.safeParse({...valid, supplyVerified: false}).success, false);
  assert.equal(paymentAuthorisationSchema.safeParse({...valid, prescriptionReference: ""}).success, false);
  assert.equal(paymentAuthorisationSchema.safeParse({...valid, role: "ADMIN"}).success, false);
});

test("authorised payment email is bilingual, priced, escaped, and links to private messaging", () => {
  const base = {...calculatePaymentSnapshot({treatment: "TIRZEPATIDE", strength: "5 mg", pricePence: 7500}), memberName: "A. Member", messagesUrl: "https://weightpilot.uk/en/messages", imageUrl: "https://weightpilot.uk/treatments/tirzepatide.jpg", accountName: "Example Account", sortCode: "12 34 56", accountNumber: "12345678"};
  const en = renderTreatmentPaymentEmail({...base, language: "en"});
  const es = renderTreatmentPaymentEmail({...base, language: "es", memberName: "<script>"});
  assert.match(en.html, /£75.00/);
  assert.match(en.html, /£4.80/);
  assert.match(en.html, /£79.80/);
  assert.match(en.html, /Tirzepatide · 5 mg/);
  assert.match(en.html, /tirzepatide.jpg/);
  assert.match(en.html, /Royal Mail Tracked 24 aims/);
  assert.match(es.html, /79,80/);
  assert.match(es.html, /Tirzepatida/);
  assert.doesNotMatch(es.html, /<script>/);
  assert.match(es.html, /&lt;script&gt;/);
});

test("communication validation permits different products and strengths after a final decision", () => {
  const base = {clientMessageId: "e398738d-c91e-45a2-9b98-14e32d812531", type: "ADMIN_UPDATE", treatment: "SEMAGLUTIDE", strength: "0.25 mg", message: "Please review the next steps in your account.", authorisationId: null};
  assert.equal(treatmentCommunicationSchema.safeParse(base).success, true);
  assert.equal(treatmentCommunicationSchema.safeParse({...base, treatment: "TIRZEPATIDE", strength: "15 mg"}).success, true);
  assert.equal(treatmentCommunicationSchema.safeParse({...base, treatment: "TIRZEPATIDE", strength: "0.25 mg"}).success, false);
  assert.equal(treatmentCommunicationSchema.safeParse({...base, type: "PAYMENT_INSTRUCTIONS"}).success, false);
  assert.equal(treatmentCommunicationSchema.safeParse({...base, type: "PAYMENT_INSTRUCTIONS", authorisationId: "e398738d-c91e-45a2-9b98-14e32d812532"}).success, true);
  const en = renderTreatmentUpdateEmail({language: "en", memberName: "Member", treatment: "SEMAGLUTIDE", strength: "1 mg", message: "Next steps <script>", messagesUrl: "https://weightpilot.uk/en/messages", imageUrl: "https://weightpilot.uk/treatments/semaglutide.jpg"});
  const es = renderTreatmentUpdateEmail({language: "es", memberName: "Member", treatment: "TIRZEPATIDE", strength: "15 mg", message: "Consulta tus próximos pasos.", messagesUrl: "https://weightpilot.uk/es/messages", imageUrl: "https://weightpilot.uk/treatments/tirzepatide.jpg"});
  assert.match(en.html, /Illustrative image/);
  assert.match(es.html, /Imagen ilustrativa/);
  assert.doesNotMatch(en.html, /<script>/);
  assert.match(en.html, /&lt;script&gt;/);
});

test("each email submission uses its own stable idempotency key and separates provider outcomes", async () => {
  registerHooks({resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return {url: "data:text/javascript,export%20default%20undefined", shortCircuit: true};
    if (specifier === "resend") return {url: `data:text/javascript,${encodeURIComponent("export class Resend { constructor() { this.emails = {send: async (...args) => { globalThis.__paymentMailCalls.push(args); if (globalThis.__paymentMailOutcome === 'timeout') throw new Error('timeout'); return globalThis.__paymentMailOutcome; }}; }}")}`, shortCircuit: true};
    if (specifier === "./email-template") return nextResolve(new URL("../src/features/treatments/email-template.ts", import.meta.url).href, context);
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    return nextResolve(specifier, context);
  }});
  const {submitTreatmentCommunication} = await import("../src/features/treatments/email.ts");
  const env = Object.fromEntries(["RESEND_API_KEY", "EMAIL_FROM"].map((key) => [key, process.env[key]]));
  Object.assign(process.env, {RESEND_API_KEY: "test-key", EMAIL_FROM: "sender@example.invalid"});
  globalThis.__paymentMailCalls = [];
  try {
    globalThis.__paymentMailOutcome = {data: {id: "resend-accepted"}, error: null};
    assert.equal((await submitTreatmentCommunication("email-one", "verified@example.invalid", {subject: "Update", html: "<p>Update</p>"})).status, "ACCEPTED");
    assert.equal((await submitTreatmentCommunication("email-two", "verified@example.invalid", {subject: "Another", html: "<p>Another</p>"})).status, "ACCEPTED");
    assert.equal(globalThis.__paymentMailCalls[0][1].idempotencyKey, "weightpilot-treatment-communication-email-one");
    assert.equal(globalThis.__paymentMailCalls[1][1].idempotencyKey, "weightpilot-treatment-communication-email-two");
    globalThis.__paymentMailOutcome = {data: null, error: {message: "rejected"}};
    assert.equal((await submitTreatmentCommunication("email-three", "verified@example.invalid", {subject: "Update", html: "<p>Update</p>"})).status, "FAILED");
    globalThis.__paymentMailOutcome = "timeout";
    assert.equal((await submitTreatmentCommunication("email-four", "verified@example.invalid", {subject: "Update", html: "<p>Update</p>"})).status, "UNCERTAIN");
  } finally {
    for (const [key, value] of Object.entries(env)) {if (value === undefined) delete process.env[key]; else process.env[key] = value;}
    delete globalThis.__paymentMailCalls; delete globalThis.__paymentMailOutcome;
  }
});

test("new communication records preserve snapshots, request decisions, and provider delivery history", () => {
  const migration = readFileSync(new URL("../drizzle/0023_white_yellowjacket.sql", import.meta.url), "utf8");
  const schema = readFileSync(new URL("../src/db/schema.ts", import.meta.url), "utf8");
  const server = readFileSync(new URL("../src/features/treatments/communications.ts", import.meta.url), "utf8");
  const route = readFileSync(new URL("../src/app/api/admin/treatment-requests/[id]/emails/route.ts", import.meta.url), "utf8");
  const webhook = readFileSync(new URL("../src/app/api/webhooks/resend/route.ts", import.meta.url), "utf8");
  assert.match(schema, /treatmentRequestCommunication = pgTable/);
  assert.match(schema, /clientMessageId: uuid/);
  assert.doesNotMatch(schema, /requestId: uuid\("request_id"\)\.primaryKey\(\).*communication/);
  assert.match(migration, /ON CONFLICT \(\"treatment\", \"strength\"\) DO NOTHING/);
  assert.match(migration, /FROM \"treatment_payment_instruction\" p/);
  assert.match(migration, /FROM \"treatment_access_request\" r/);
  assert.match(server, /clientMessageId: input.clientMessageId/);
  assert.match(server, /subject: prepared.content.subject, html: prepared.content.html/);
  assert.match(server, /price\?\.pricePence !== prepared.snapshot\?\.itemPricePence/);
  assert.match(server, /treatmentSupplyAuthorisation.strength, input.strength/);
  assert.match(server, /eq\(treatmentRequestCommunication.requestId, requestId\), eq\(treatmentRequestCommunication.id, emailId\)/);
  assert.match(route, /getAdminApiUser\(request\)/);
  assert.match(webhook, /applyTreatmentCommunicationDeliveryEvent/);
});

test("all eleven exact-strength defaults are inserted without overwriting existing prices", () => {
  const migration = readFileSync(new URL("../drizzle/0023_white_yellowjacket.sql", import.meta.url), "utf8");
  const expected = {"TIRZEPATIDE:2.5 mg": 5500, "TIRZEPATIDE:5 mg": 7500, "TIRZEPATIDE:7.5 mg": 10000, "TIRZEPATIDE:10 mg": 11500, "TIRZEPATIDE:12.5 mg": 12000, "TIRZEPATIDE:15 mg": 12000, "SEMAGLUTIDE:0.25 mg": 3200, "SEMAGLUTIDE:0.5 mg": 4600, "SEMAGLUTIDE:1 mg": 6000, "SEMAGLUTIDE:1.7 mg": 7000, "SEMAGLUTIDE:2.4 mg": 7500};
  for (const [key, price] of Object.entries(expected)) {
    const [treatment, strength] = key.split(":");
    assert.ok(migration.includes(`('${treatment}', '${strength}', ${price})`), key);
  }
  assert.match(migration, /ON CONFLICT \(\"treatment\", \"strength\"\) DO NOTHING/);
  const pricing = readFileSync(new URL("../src/components/pricing/pricing-management.tsx", import.meta.url), "utf8");
  assert.match(pricing, /StrengthPriceEditor initialData/);
  assert.doesNotMatch(pricing, /t\("month",/);
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
