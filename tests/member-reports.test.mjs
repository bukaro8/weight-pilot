import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("member report queries expose only delivered reports owned by the signed-in member", async () => {
  const source = await read("../src/features/reports/member.ts");
  assert.match(source, /eq\(questionnaire\.userId, userId\)/u);
  assert.match(source, /eq\(questionnaireReviewRequest\.requestedByUserId, userId\)/u);
  assert.match(source, /eq\(consultationReport\.sendStatus, "DELIVERED"\)/u);
  assert.match(source, /isNotNull\(consultationReport\.deliveredAt\)/u);
  assert.doesNotMatch(source, /questionnaireReviewRequest\.status, "COMPLETED"/u);
  assert.doesNotMatch(source, /sendStatus, "ACCEPTED"/u);
  assert.match(source, /z\.uuid\(\)\.safeParse\(reportId\)/u);
});

test("member report reader rebuilds the delivered email from immutable saved content and savings snapshot", async () => {
  const source = await read("../src/features/reports/member.ts");
  assert.match(source, /content: record\.report\.content/u);
  assert.match(source, /record\.report\.savingsComparisonEnabled \? record\.report\.savingsComparison : null/u);
  assert.match(source, /renderGuidanceReportEmail/u);
  assert.match(source, /deliveredAt: record\.report\.deliveredAt\.toISOString\(\)/u);
});

test("assessment results distinguish requested, in-review and delivered report states with report and message links", async () => {
  const component = await read("../src/components/assessment/treatment-results.tsx");
  const translations = await Promise.all([
    read("../src/messages/member-area/en.json").then(JSON.parse),
    read("../src/messages/member-area/es.json").then(JSON.parse),
  ]);
  assert.match(component, /reviewRequest\?\.status === "REQUESTED"/u);
  assert.match(component, /reviewRequest\?\.status === "IN_REVIEW"/u);
  assert.match(component, /reportReady \? memberAreaT\("completedTitle"\)/u);
  assert.match(component, /href=\{`\/reports\/\$\{reviewRequest\.reportId\}`\}/u);
  assert.match(component, /href="\/messages"/u);
  for (const messages of translations) {
    assert.equal(messages.reviewStatus.completedTitle.length > 0, true);
    assert.equal(messages.reviewStatus.viewReport.length > 0, true);
    assert.equal(messages.reviewStatus.sendMessage.length > 0, true);
  }
});

test("member dashboard links to reports, messages and invitations and reads unread count", async () => {
  const [page, server] = await Promise.all([
    read("../src/app/[locale]/(member)/dashboard/page.tsx"),
    read("../src/features/member-area/server.ts"),
  ]);
  assert.match(page, /href="\/reports"/u);
  assert.match(page, /href="\/messages"/u);
  assert.match(page, /href="\/invitations"/u);
  assert.match(page, /t\("readyTitle"\)/u);
  assert.match(page, /href=\{`\/reports\/\$\{data\.latestReport\.id\}`\}/u);
  assert.match(page, /href="\/messages"/u);
  assert.match(page, /getMemberReportCardState/u);
  assert.match(page, /reportState === "REQUESTED" \|\| reportState === "IN_REVIEW"/u);
  assert.match(server, /countMemberUnreadMessages\(userId\)/u);
  assert.match(server, /selectLatestDeliveredReport\(reports\)/u);
});

test("dashboard report copy is complete in English and Spanish without a misleading no-report state", async () => {
  const translations = await Promise.all([
    read("../src/messages/member-area/en.json").then(JSON.parse),
    read("../src/messages/member-area/es.json").then(JSON.parse),
  ]);
  for (const messages of translations) {
    assert.ok(messages.dashboard.readyTitle);
    assert.ok(messages.dashboard.readyBody);
    assert.ok(messages.dashboard.viewLatestReport);
    assert.ok(messages.dashboard.messageAboutReport);
    assert.ok(messages.dashboard.requestedTitle);
    assert.ok(messages.dashboard.preparingTitle);
  }
});

test("latest report selector handles empty and multiple delivered reports; delivered state wins over stale review status", async () => {
  const {getMemberReportCardState, selectLatestDeliveredReport} = await import("../src/features/member-area/report-state.ts");
  assert.equal(selectLatestDeliveredReport([]), null);
  const latest = selectLatestDeliveredReport([
    {id: "older", deliveredAt: "2026-02-01T10:00:00.000Z", assessmentReference: "WP-OLD", language: "en"},
    {id: "newer", deliveredAt: "2026-03-01T10:00:00.000Z", assessmentReference: "WP-NEW", language: "es"},
  ]);
  assert.equal(latest?.id, "newer");
  assert.equal(getMemberReportCardState(true, "IN_REVIEW"), "READY");
  assert.equal(getMemberReportCardState(false, "REQUESTED"), "REQUESTED");
  assert.equal(getMemberReportCardState(false, "IN_REVIEW"), "IN_REVIEW");
  assert.equal(getMemberReportCardState(false, "COMPLETED"), null);
  assert.equal(getMemberReportCardState(false, null), null);
});
