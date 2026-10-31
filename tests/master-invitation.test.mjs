import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

import {getInvitationStatus, invitationIsAvailable} from "../src/features/invitations/policy.ts";
import {invitationShareMessage} from "../src/features/invitations/sharing.ts";
import {renderInvitationEmail} from "../src/features/invitations/template.ts";

const now = new Date("2026-11-01T12:00:00Z");

test("standard invitations remain seven-day, single-use invitations", () => {
  const available = {kind: "STANDARD", redeemedAt: null, revokedAt: null, expiresAt: new Date("2026-11-02T12:00:00Z")};
  assert.equal(invitationIsAvailable(available, now), true);
  assert.equal(getInvitationStatus({...available, redeemedAt: now}, now), "USED");
  assert.equal(invitationIsAvailable({...available, expiresAt: now}, now), false);
  assert.equal(getInvitationStatus({...available, expiresAt: now}, now), "EXPIRED");
});

test("master invitation stays available after multiple uses, without an expiry, until revoked", () => {
  const master = {kind: "MASTER", redeemedAt: null, revokedAt: null, expiresAt: null};
  assert.equal(invitationIsAvailable(master, now), true);
  assert.equal(invitationIsAvailable(master, new Date("2100-01-01T00:00:00Z")), true);
  assert.equal(getInvitationStatus({...master, revokedAt: now}, now), "REVOKED");
  assert.equal(invitationIsAvailable({...master, revokedAt: now}, now), false);
});

test("master sharing copy is bilingual and does not falsely claim single use or seven-day expiry", () => {
  const link = "https://weightpilot.uk/en/register?code=WP_example";
  for (const language of ["en", "es"]) {
    const message = invitationShareMessage(language, link, "MASTER");
    const email = renderInvitationEmail(language, link, message, "MASTER");
    assert.equal(email.html.includes(link.replaceAll("&", "&amp;")), true);
    assert.equal(email.text.includes(link), true);
    assert.equal(/7 days|7 días|once and expires|un solo uso/u.test(email.html), false);
  }
});

test("master creation is admin-only and both registration paths record each redemption", async () => {
  const [route, server, migration] = await Promise.all([
    "../src/app/api/invitations/route.ts",
    "../src/features/invitations/server.ts",
    "../drizzle/0019_young_firebird.sql",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")));
  assert.match(route, /parsed\.data\.kind === "MASTER" && currentUser\.role !== "ADMIN"/u);
  assert.match(server, /creator\?\.role !== "ADMIN" \|\| creator\.status !== "ACTIVE" \|\| !creator\.emailVerified/u);
  assert.equal((server.match(/eq\(invitation\.kind, "MASTER"\)/gu) ?? []).length, 2);
  assert.equal((server.match(/usageCount: sql`\$\{invitation\.usageCount\} \+ 1`/gu) ?? []).length, 2);
  assert.equal((server.match(/transaction\.insert\(referral\)/gu) ?? []).length, 2);
  assert.match(migration, /DROP CONSTRAINT "referral_invitation_id_unique"/u);
});
