import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

test("member dashboard invitation card links to the existing invitation flow", async () => {
  const page = await readFile(new URL("../src/app/[locale]/(member)/dashboard/page.tsx", import.meta.url), "utf8");
  assert.match(page, /aria-labelledby="invite-friends-title"/u);
  assert.match(page, /href="\/invitations"/u);
  assert.match(page, /"inviteStepJoin"/u);
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
