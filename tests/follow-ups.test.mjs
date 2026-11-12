import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {registerHooks} from "node:module";
import test from "node:test";

registerHooks({resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return {url: "data:text/javascript,export%20default%20undefined", shortCircuit: true};
  if (specifier === "resend") return {url: `data:text/javascript,${encodeURIComponent("export class Resend { constructor() { this.emails = {send: async (...args) => { globalThis.__followUpMailCalls.push(args); return globalThis.__followUpMailResult; }}; }}")}`, shortCircuit: true};
  if (specifier === "./template") return nextResolve(new URL("../src/features/follow-ups/template.ts", import.meta.url).href, context);
  if (specifier.startsWith("@/")) return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
  return nextResolve(specifier, context);
}});

const {followUpEligible, needsRecentReminderConfirmation} = await import("../src/features/follow-ups/policy.ts");
const {followUpSendSchema} = await import("../src/features/follow-ups/validation.ts");
const {defaultFollowUpText, renderFollowUpEmail} = await import("../src/features/follow-ups/template.ts");
const {configuredReplyTo, renderNoReplyNotice} = await import("../src/features/email/notice.ts");
const {submitFollowUpEmail} = await import("../src/features/follow-ups/email.ts");

const candidate = {role: "USER", status: "ACTIVE", emailVerified: true, category: "INCOMPLETE_ASSESSMENT", hasDraft: true, hasSubmittedAssessment: false, hasApprovedRequest: false, doNotRemind: false};
const validInput = {memberId: "29d1cd84-7c11-45c9-a61a-14f51a79088f", category: "INCOMPLETE_ASSESSMENT", clientActionId: "8f1d8365-901c-4219-8579-eb4886d03e0b", language: "en", subject: "Please continue", message: "Please continue your assessment.", confirmRecent: false, confirmed: true};

test("follow-up eligibility requires the exact stage and active verified member", () => {
  assert.equal(followUpEligible(candidate), true);
  assert.equal(followUpEligible({...candidate, category: "TREATMENT_FOLLOW_UP"}), false);
  assert.equal(followUpEligible({...candidate, category: "TREATMENT_FOLLOW_UP", hasApprovedRequest: true}), true);
  for (const change of [{status: "INACTIVE"}, {emailVerified: false}, {role: "ADMIN"}, {doNotRemind: true}, {hasDraft: false}, {hasSubmittedAssessment: true}]) {
    assert.equal(followUpEligible({...candidate, ...change}), false);
  }
});

test("recent reminder warning lasts seven days", () => {
  const now = new Date("2026-11-12T12:00:00Z");
  assert.equal(needsRecentReminderConfirmation("2026-11-06T12:00:00Z", now), true);
  assert.equal(needsRecentReminderConfirmation("2026-11-05T12:00:00Z", now), false);
  assert.equal(needsRecentReminderConfirmation(null, now), false);
});

test("sending requires an explicit confirmation and validates inputs", () => {
  assert.equal(followUpSendSchema.safeParse(validInput).success, true);
  assert.equal(followUpSendSchema.safeParse({...validInput, confirmed: false}).success, false);
  assert.equal(followUpSendSchema.safeParse({...validInput, recipient: "other@example.com"}).success, false);
  assert.equal(followUpSendSchema.safeParse({...validInput, message: "short"}).success, false);
});

test("both templates use the right language, secure links, escaping and no-reply footer", () => {
  for (const language of ["en", "es"]) for (const category of ["INCOMPLETE_ASSESSMENT", "TREATMENT_FOLLOW_UP"]) {
    const draft = defaultFollowUpText(category, language, "Alex");
    const result = renderFollowUpEmail({category, language, ...draft, actionUrl: `https://weightpilot.uk/${language}/consultations`, messagesUrl: `https://weightpilot.uk/${language}/messages`});
    assert.match(result.html, new RegExp(`<html lang="${language}">`));
    assert.match(result.html, new RegExp(`https://weightpilot.uk/${language}/messages`));
    assert.match(result.html, /do not reply|no respondas/iu);
    assert.match(result.text, /do not reply|no respondas/iu);
  }
  const malicious = renderFollowUpEmail({category: "INCOMPLETE_ASSESSMENT", language: "en", subject: "Hello", message: "Hi <script>alert(1)</script>", actionUrl: "https://weightpilot.uk/en/consultations", messagesUrl: "https://weightpilot.uk/en/messages"});
  assert.doesNotMatch(malicious.html, /<script>/u);
  assert.match(malicious.html, /&lt;script&gt;/u);
});

test("Reply-To is used only when explicitly configured on the sender domain", () => {
  assert.equal(configuredReplyTo("WeightPilot <hello@weightpilot.uk>", undefined), undefined);
  assert.equal(configuredReplyTo("WeightPilot <hello@weightpilot.uk>", "unmonitored@weightpilot.uk"), "unmonitored@weightpilot.uk");
  assert.equal(configuredReplyTo("WeightPilot <hello@weightpilot.uk>", "other@example.com"), undefined);
  assert.equal(renderNoReplyNotice("en", "http://localhost/messages").html.includes("localhost"), false);
});

test("Resend success, rejection and uncertainty preserve a stable send key", async () => {
  const previous = Object.fromEntries(["RESEND_API_KEY", "EMAIL_FROM", "EMAIL_REPLY_TO"].map((key) => [key, process.env[key]]));
  Object.assign(process.env, {RESEND_API_KEY: "test-key", EMAIL_FROM: "WeightPilot <hello@weightpilot.uk>", EMAIL_REPLY_TO: "unmonitored@weightpilot.uk"});
  globalThis.__followUpMailCalls = [];
  const input = {id: "follow-up-123", recipient: "verified@example.com", category: "INCOMPLETE_ASSESSMENT", language: "en", subject: "Please continue", message: "Please continue your assessment.", actionUrl: "https://weightpilot.uk/en/consultations", messagesUrl: "https://weightpilot.uk/en/messages"};
  try {
    globalThis.__followUpMailResult = {data: {id: "resend-123"}, error: null};
    assert.deepEqual(await submitFollowUpEmail(input), {kind: "ACCEPTED", providerMessageId: "resend-123"});
    assert.equal(globalThis.__followUpMailCalls[0][0].to, input.recipient);
    assert.equal(globalThis.__followUpMailCalls[0][0].replyTo, "unmonitored@weightpilot.uk");
    assert.equal(globalThis.__followUpMailCalls[0][1].idempotencyKey, "weightpilot-follow-up-follow-up-123");
    globalThis.__followUpMailResult = {data: null, error: {name: "rejected"}};
    assert.deepEqual(await submitFollowUpEmail(input), {kind: "REJECTED"});
    globalThis.__followUpMailResult = {data: null, error: null};
    assert.deepEqual(await submitFollowUpEmail(input), {kind: "UNCERTAIN"});
  } finally {
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});

test("admin-only routes, scoped recipient and persisted history are wired", () => {
  const route = readFileSync(new URL("../src/app/api/admin/follow-ups/route.ts", import.meta.url), "utf8");
  const server = readFileSync(new URL("../src/features/follow-ups/server.ts", import.meta.url), "utf8");
  const migration = readFileSync(new URL("../drizzle/0020_orange_jocasta.sql", import.meta.url), "utf8");
  assert.match(route, /getAdminApiUser\(request\)/u);
  assert.match(server, /recipient: member\.email/u);
  assert.match(server, /eq\(user\.status, "ACTIVE"\)/u);
  assert.match(server, /eq\(user\.emailVerified, true\)/u);
  assert.match(server, /listMemberFollowUpHistory/u);
  assert.match(server, /clientActionId/u);
  assert.match(server, /RECENT_DUPLICATE/u);
  assert.match(server, /RATE_LIMITED/u);
  assert.match(migration, /CREATE TABLE "member_follow_up"/u);
  assert.match(migration, /ON DELETE cascade/u);
});
