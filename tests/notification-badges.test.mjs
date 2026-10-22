import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {badgeText, memberRequestUnreadStatuses, memberNavigationCount, adminNavigationCount, emptyNavigationCounts} from "../src/features/notifications/policy.ts";
import {isMemberReportVisible} from "../src/features/member-area/report-state.ts";

test("badges are absent at zero, capped at 9+, and aggregates do not double-count", () => {
  assert.equal(badgeText(9), "9");
  assert.equal(badgeText(10), "9+");
  assert.equal(memberNavigationCount({...emptyNavigationCounts, messages: 2, requests: 3, reports: 1}), 6);
  assert.equal(adminNavigationCount({...emptyNavigationCounts, messages: 2, treatmentRequests: 3}), 5);
});

test("member request attention excludes own submission and terminal cancellation", () => {
  assert.deepEqual(memberRequestUnreadStatuses, ["UNDER_REVIEW", "APPROVED_FOR_NEXT_STEPS", "DECLINED"]);
  assert.equal(memberRequestUnreadStatuses.includes("SUBMITTED"), false);
  assert.equal(memberRequestUnreadStatuses.includes("CANCELLED"), false);
});

test("only reports accepted by the provider or delivered can become member notifications", () => {
  const report = {providerMessageId: "provider-id", acceptedAt: new Date(), deliveredAt: null};
  assert.equal(isMemberReportVisible({...report, sendStatus: "ACCEPTED"}), true);
  assert.equal(isMemberReportVisible({...report, sendStatus: "DRAFT"}), false);
  assert.equal(isMemberReportVisible({...report, sendStatus: "SENDING"}), false);
  assert.equal(isMemberReportVisible({...report, sendStatus: "FAILED"}), false);
  assert.equal(isMemberReportVisible({...report, sendStatus: "ACCEPTED", providerMessageId: null}), false);
  assert.equal(isMemberReportVisible({...report, sendStatus: "DELIVERED", deliveredAt: new Date()}), true);
});

test("navigation labels exist in both languages and viewed markers are migrated", () => {
  for (const language of ["en", "es"]) {
    const messages = JSON.parse(readFileSync(new URL(`../src/messages/${language}.json`, import.meta.url)));
    assert.match(messages.nav.itemUnread, /\{item\}.*\{count\}/);
    assert.match(messages.adminNav.itemUnread, /\{item\}.*\{count\}/);
  }
  const migration = readFileSync(new URL("../drizzle/0018_free_cammi.sql", import.meta.url), "utf8");
  assert.match(migration, /consultation_report.*member_viewed_at/);
  assert.match(migration, /treatment_access_request.*member_viewed_at/);
  assert.match(migration, /treatment_access_request.*admin_viewed_at/);
});
