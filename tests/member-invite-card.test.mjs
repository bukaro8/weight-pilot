import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

test("invitation access stays in member navigation without distracting from dashboard next steps", async () => {
  const [page, header] = await Promise.all([
    readFile(new URL("../src/app/[locale]/(member)/dashboard/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/site-header.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(page, /aria-labelledby="invite-friends-title"/u);
  assert.match(header, /\["\/invitations", "invitations"\]/u);
});

test("invitation steps and expiry are explained in both languages", async () => {
  for (const locale of ["en", "es"]) {
    const messages = JSON.parse(await readFile(new URL(`../src/messages/member-area/${locale}.json`, import.meta.url), "utf8"));
    const card = messages.dashboard;
    for (const key of ["inviteEyebrow", "inviteTitle", "inviteBody", "inviteHowTitle", "inviteStepCreate", "inviteStepShare", "inviteStepJoin", "inviteNote", "inviteAction"]) {
      assert.ok(card[key], `${locale} is missing ${key}`);
    }
    assert.doesNotMatch(Object.values(card).join(" "), /20\s?%/u);
  }
});
