import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const en = JSON.parse(read("../src/messages/serum/en.json"));
const es = JSON.parse(read("../src/messages/serum/es.json"));
const keys = (value, prefix = "") => Object.entries(value).flatMap(([key, child]) => typeof child === "object" ? keys(child, `${prefix}${key}.`) : `${prefix}${key}`).sort();

test("serum translations have matching keys and the exact supplied finished-product ingredients", () => {
  assert.deepEqual(keys(en), keys(es));
  for (const content of [en, es]) {
    assert.equal(content.ingredients, "Aqua, GHK-Cu, Ectoin, Sodium Hyaluronate, Phenoxyethanol, Ethylhexylglycerin.");
    assert.equal(content.size, "30 mL");
    assert.match(content.actives.copper.name, /1%$/);
    assert.match(content.actives.ectoin.name, /2%$/);
    assert.match(content.actives.hyaluronic.name, /0[.,]3%$/);
    assert.match(content.preservative, /Plantaserve E/);
  }
});

test("both languages retain all five night-use steps, timing, quantities and hand instructions", () => {
  for (const content of [en, es]) {
    assert.deepEqual(Object.keys(content.steps), ["wash", "apply", "spread", "wait", "moisturise"]);
    assert.match(content.steps.apply, /2–4/);
    assert.match(content.steps.wait, /30–60/);
    assert.ok(content.handsBody.length > 50);
    assert.equal(Object.keys(content.storage).length, 3);
    assert.equal(Object.keys(content.notes).length, 3);
  }
  assert.match(en.steps.apply, /neck/);
  assert.match(es.steps.apply, /cuello/);
  assert.match(en.frequency, /Once daily.*thin layer/);
  assert.match(es.frequency, /Una vez al día.*capa fina/);
});

test("public page preserves section order, uses local non-cropped imagery and has no authentication gate", () => {
  const page = read("../src/app/[locale]/(public)/serums/ghk-cu/page.tsx");
  const headings = ["how-to-title", "actives-title", "together-title", "hands-title", "ingredients-title", "storage-title", "notes-title"];
  const positions = headings.map((heading) => page.indexOf(`id="${heading}"`));
  assert.ok(positions.every((position, index) => position >= 0 && (!index || position > positions[index - 1])));
  assert.match(page, /object-contain/);
  assert.match(page, /@\/assets\/images\/WeightPilot Copper Renew Serum\.png/);
  assert.doesNotMatch(page, /requireMember|requireAdmin|auth\/server|features\/auth/);
});

test("only the serum QR route uses unprefixed English; existing locale routing is retained", () => {
  const proxy = read("../src/proxy.ts");
  assert.match(proxy, /localePrefix: "as-needed", localeDetection: false/);
  assert.match(proxy, /return handleLocaleRouting\(request\)/);
  const pattern = proxy.match(/if \((\/\^.*?\$\/)\.test\(request\.nextUrl\.pathname\)\) return handleSerumRouting/);
  assert.ok(pattern);
  const route = new RegExp(pattern[1].slice(1, -1));
  for (const path of ["/serums/ghk-cu", "/serums/ghk-cu/"]) assert.ok(route.test(path));
  for (const path of ["/en/serums/ghk-cu", "/es/serums/ghk-cu", "/en/admin", "/dashboard", "/en", "/serums/ghk-cu/other", "/serums/other"]) assert.equal(route.test(path), false);
});

test("reference-inspired decoration stays page-scoped and does not replace the supplied instructions", () => {
  const page = read("../src/app/[locale]/(public)/serums/ghk-cu/page.tsx");
  const css = read("../src/app/[locale]/(public)/serums/ghk-cu/serum.css");
  assert.match(page, /import "\.\/serum\.css"/);
  assert.match(page, /className="wp-serum-page flex-1"/);
  assert.ok([...css.matchAll(/(?<![\w-])\.([a-z][\w-]*)/g)].every(([, name]) => name.startsWith("wp-serum-")));
  assert.equal(en.collection, "Copper Renew");
  assert.equal(es.collection, en.collection);
  assert.match(en.steps.wait, /30–60 seconds/);
  assert.doesNotMatch(JSON.stringify(en), /10 seconds|warm water|patch test/i);
});
