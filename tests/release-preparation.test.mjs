import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

import {resolveInitialLocale, localizedRootPath} from "../src/i18n/locale-preference.ts";
import {ASSESSMENT_MINIMUM_DURATION_MS, assessmentLoaderStage, canFinishAssessmentLoading} from "../src/features/assessment/loading.ts";
import {headerNavigationKind} from "../src/features/navigation/visibility.ts";
import {hasRiskyLegacyProfileDrop} from "../scripts/migration-safety.mjs";

test("signed-out, pending, member and administrator navigation stay separated", () => {
  assert.equal(headerNavigationKind(true, "USER"), "public");
  assert.equal(headerNavigationKind(false, undefined), "public");
  assert.equal(headerNavigationKind(false, "USER"), "member");
  assert.equal(headerNavigationKind(false, "ADMIN"), "admin");
});

test("root language selection prioritises manual choice, saved member preference, then browser language", () => {
  assert.equal(resolveInitialLocale({manualLocale: "en", memberLocale: "es", acceptLanguage: "es-ES"}), "en");
  assert.equal(resolveInitialLocale({memberLocale: "es", acceptLanguage: "en-GB"}), "es");
  assert.equal(resolveInitialLocale({acceptLanguage: "es-MX,es;q=0.9,en;q=0.5"}), "es");
  assert.equal(resolveInitialLocale({acceptLanguage: "fr-FR,fr;q=0.9"}), "en");
  assert.equal(resolveInitialLocale({}), "en");
});

test("locale redirect retains invitation and repeated query parameters", () => {
  assert.equal(localizedRootPath("es", {code: "invite-secret", next: "/register", tag: ["one", "two"]}), "/es?code=invite-secret&next=%2Fregister&tag=one&tag=two");
});

test("assessment loader advances at two-second boundaries and waits for results plus six seconds", () => {
  assert.equal(assessmentLoaderStage(0), 0);
  assert.equal(assessmentLoaderStage(1999), 0);
  assert.equal(assessmentLoaderStage(2000), 1);
  assert.equal(assessmentLoaderStage(4000), 2);
  assert.equal(assessmentLoaderStage(9000), 2);
  assert.equal(ASSESSMENT_MINIMUM_DURATION_MS, 6000);
  assert.equal(canFinishAssessmentLoading(5999, true), false);
  assert.equal(canFinishAssessmentLoading(6000, false), false);
  assert.equal(canFinishAssessmentLoading(6000, true), true);
});

test("questionnaire submission guards duplicate sends and restores the form after failure", async () => {
  const source = await readFile(new URL("../src/components/questionnaire/questionnaire-flow.tsx", import.meta.url), "utf8");
  assert.match(source, /if \(submittingRef\.current \|\| questionnaire\.status !== "DRAFT"\) return/u);
  assert.match(source, /catch \{ setSubmissionStartedAt\(null\); setMessage\(t\("errors\.submit"\)\); \}/u);
  assert.match(source, /finally \{ submittingRef\.current = false; setSubmitting\(false\); \}/u);
});

test("migration preflight blocks the known legacy data drop only when records exist", () => {
  const pending = [{tag: "0001_wet_the_order", sql: 'DROP TABLE "profiles" CASCADE;'}];
  assert.equal(hasRiskyLegacyProfileDrop(pending, true), true);
  assert.equal(hasRiskyLegacyProfileDrop(pending, false), false);
  assert.equal(hasRiskyLegacyProfileDrop([{tag: "0010_high_freak", sql: 'ALTER TABLE "report" ADD COLUMN "cost" jsonb;'}], true), false);
});

test("production gates startup on migrations and never bootstraps an administrator", async () => {
  const [compose, dockerfile] = await Promise.all([
    readFile(new URL("../docker-compose.yml", import.meta.url), "utf8"),
    readFile(new URL("../Dockerfile", import.meta.url), "utf8"),
  ]);
  assert.match(compose, /profiles: \["tools"\]/u);
  assert.ok(dockerfile.includes('ENTRYPOINT ["sh", "scripts/start-production.sh"]'));
  assert.doesNotMatch(dockerfile.slice(dockerfile.indexOf("FROM base AS runner")), /bootstrap-admin/u);
  assert.match(compose, /command: \["npm", "run", "auth:bootstrap-admin"\]/u);
  assert.match(dockerfile, /CMD \["node", "server\.js"\]/u);
  assert.match(dockerfile.slice(dockerfile.indexOf("FROM base AS runner")), /CMD \["node", "server\.js"\]/u);
});
