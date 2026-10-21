import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("member report queries expose only completed, delivered reports owned by the signed-in member", async () => {
  const source = await read("../src/features/reports/member.ts");
  assert.match(source, /eq\(questionnaire\.userId, userId\)/u);
  assert.match(source, /eq\(questionnaireReviewRequest\.requestedByUserId, userId\)/u);
  assert.match(source, /eq\(questionnaireReviewRequest\.status, "COMPLETED"\)/u);
  assert.match(source, /eq\(consultationReport\.sendStatus, "DELIVERED"\)/u);
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
  assert.match(server, /countMemberUnreadMessages\(userId\)/u);
});
