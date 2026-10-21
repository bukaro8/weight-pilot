import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

import {privateMessageSchema} from "../src/features/messages/validation.ts";
import {renderPrivateMessageNotification} from "../src/features/messages/template.ts";

test("message validation trims text, enforces limits, and requires a client idempotency id", () => {
  const clientMessageId = "29d1cd84-7c11-45c9-a61a-14f51a79088f";
  assert.deepEqual(privateMessageSchema.parse({body: "  Hello  ", clientMessageId}), {body: "Hello", clientMessageId});
  assert.equal(privateMessageSchema.safeParse({body: "   ", clientMessageId}).success, false);
  assert.equal(privateMessageSchema.safeParse({body: "x".repeat(4001), clientMessageId}).success, false);
  assert.equal(privateMessageSchema.safeParse({body: "Hello"}).success, false);
  assert.equal(privateMessageSchema.safeParse({body: "Hello", clientMessageId, attachment: "image.png"}).success, false);
});

test("message notifications are bilingual, generic, and escape the secure link", () => {
  const sensitiveMessage = "Private health detail must never be mailed";
  const en = renderPrivateMessageNotification({language: "en", url: "https://weightpilot.example/en/messages?x=\"<script>"});
  const es = renderPrivateMessageNotification({language: "es", url: "https://weightpilot.example/es/messages"});
  assert.match(en.html, /<html lang="en">/u);
  assert.match(es.html, /<html lang="es">/u);
  assert.match(en.subject, /private WeightPilot message/u);
  assert.match(es.subject, /mensaje privado/u);
  assert.equal(JSON.stringify(en).includes(sensitiveMessage), false);
  assert.equal(en.html.includes("<script>"), false);
  assert.match(en.html, /&lt;script&gt;/u);
  assert.equal(en.text.includes(sensitiveMessage), false);
});

test("message APIs independently enforce member ownership and administrator role", async () => {
  const files = [
    "../src/app/api/messages/route.ts",
    "../src/app/api/messages/read/route.ts",
    "../src/app/api/messages/unread/route.ts",
    "../src/app/api/admin/messages/route.ts",
    "../src/app/api/admin/messages/[conversationId]/route.ts",
    "../src/app/api/admin/messages/[conversationId]/read/route.ts",
    "../src/features/messages/server.ts",
  ];
  const sources = await Promise.all(files.map((path) => readFile(new URL(path, import.meta.url), "utf8")));
  assert.match(sources[0], /getQuestionnaireApiUser\(request\)/u);
  assert.match(sources[0], /actor\.role !== "USER"/u);
  assert.match(sources[3], /getAdminApiUser\(request\)/u);
  assert.match(sources[4], /getAdminApiUser\(request\)/u);
  assert.match(sources[6], /conversation\.memberId !== actor\.id/u);
  assert.match(sources[6], /canAccessPrivateServices\(freshActor\)/u);
  assert.match(sources[6], /canAccessAdmin\(freshActor\)/u);
});

test("message sends are rate limited and Resend retries use a stable idempotency key without message content", async () => {
  const [security, email, server, schema, migration] = await Promise.all([
    "../src/features/messages/security.ts", "../src/features/messages/email.ts", "../src/features/messages/server.ts",
    "../src/db/schema.ts", "../drizzle/0009_neat_emma_frost.sql",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")));
  assert.match(security, /message:send:10m/u);
  assert.match(security, /message:send:1h/u);
  assert.match(email, /idempotencyKey: `weightpilot-message-\$\{input\.messageId\}`/u);
  assert.match(server, /if \(result\.created\)/u);
  assert.match(schema, /memberId: uuid\("member_id"\)\.notNull\(\)\.unique\(\)/u);
  assert.match(schema, /clientMessageId: uuid\("client_message_id"\)\.notNull\(\)\.unique\(\)/u);
  assert.match(migration, /ON DELETE cascade/u);
  assert.match(migration, /char_length\(trim\("private_message"\."body"\)\) between 1 and 4000/u);
});
