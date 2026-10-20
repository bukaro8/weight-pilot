import assert from "node:assert/strict";
import test from "node:test";

import {buildAdminDashboardData} from "../src/features/admin/analytics.ts";
import {filterAdminUsers} from "../src/features/admin/filters.ts";

const members = [
  {id: "u1", name: "Ana Example", email: "ana@example.test", createdAt: "2026-01-02T12:00:00.000Z", status: "ACTIVE", emailVerified: true, preferredLanguage: "es", referralSource: null, reviewRequests: []},
  {id: "u2", name: "Ben Example", email: "ben@example.test", createdAt: "2026-01-01T12:00:00.000Z", status: "INACTIVE", emailVerified: false, preferredLanguage: "en", referralSource: {name: "Ana Example", email: "ana@example.test"}, reviewRequests: []},
];

const reviews = [
  {id: "r1", memberId: "u1", memberName: "Ana Example", memberEmail: "ana@example.test", language: "es", status: "REQUESTED", requestedAt: "2026-01-03T12:00:00.000Z", updatedAt: "2026-01-03T12:00:00.000Z"},
  {id: "r2", memberId: "u2", memberName: "Ben Example", memberEmail: "ben@example.test", language: "en", status: "COMPLETED", requestedAt: "2026-01-02T12:00:00.000Z", updatedAt: "2026-01-04T12:00:00.000Z"},
];

test("dashboard derives accurate member and review counts", () => {
  const dashboard = buildAdminDashboardData(members, reviews);
  assert.deepEqual(dashboard.counts, {totalUsers: 2, activeUsers: 1, inactiveUsers: 1, requestedReviews: 1, inReview: 0, completedReviews: 1});
  assert.deepEqual(dashboard.pendingReviews.map((entry) => entry.id), ["r1"]);
  assert.equal(dashboard.recentActivity[0].id, "review-r2");
});

test("user directory search and filters combine predictably", () => {
  assert.deepEqual(filterAdminUsers(members, "ana", "ALL", "ALL").map((entry) => entry.id), ["u1"]);
  assert.deepEqual(filterAdminUsers(members, "example.test", "INACTIVE", "UNVERIFIED").map((entry) => entry.id), ["u2"]);
  assert.deepEqual(filterAdminUsers(members, "ana", "INACTIVE", "ALL"), []);
});
