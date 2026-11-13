import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {existsSync} from "node:fs";
import {extname} from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {registerHooks} from "node:module";
import test from "node:test";
import {drizzle} from "drizzle-orm/postgres-js";
import postgres from "postgres";

const databaseUrl = process.env.TEST_DATABASE_URL;
const safeTestDatabase = databaseUrl && (() => {
  const parsed = new URL(databaseUrl);
  return ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) && parsed.pathname.endsWith("_test");
})();

if (!safeTestDatabase) {
  test.skip("message welcome integration requires a loopback TEST_DATABASE_URL ending in _test", () => {});
} else {
  const sourceRoot = new URL("../src/", import.meta.url);
  const emailStub = "data:text/javascript,export async function sendPrivateMessageNotification(input){globalThis.__messageNotifications.push(input);if(globalThis.__failNotificationFor===input.recipient)throw Error('TEST_NOTIFICATION_FAILURE');return {ok:true}}";
  const dbStub = "data:text/javascript,export function getDb(){return globalThis.__messageTestDb}";
  registerHooks({resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return {url: "data:text/javascript,export{}", shortCircuit: true};
    if (specifier === "@/features/messages/email") return {url: emailStub, shortCircuit: true};
    if (specifier === "@/db") return {url: dbStub, shortCircuit: true};
    let path;
    if (specifier.startsWith("@/")) path = fileURLToPath(new URL(specifier.slice(2), sourceRoot));
    else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) path = fileURLToPath(new URL(specifier, context.parentURL));
    if (path && !extname(path)) {
      const resolved = existsSync(`${path}.ts`) ? `${path}.ts` : existsSync(`${path}/index.ts`) ? `${path}/index.ts` : null;
      if (resolved) return nextResolve(pathToFileURL(resolved).href, context);
    }
    return nextResolve(specifier, context);
  }});

  const schema = await import("../src/db/schema.ts");
  const {sendMemberMessage, sendAdminMessage} = await import("../src/features/messages/server.ts");
  const sql = postgres(databaseUrl, {prepare: false, max: 4});
  const db = drizzle(sql, {schema});
  globalThis.__messageTestDb = db;
  globalThis.__messageNotifications = [];

  const adminId = randomUUID();
  const memberEnId = randomUUID();
  const memberEsId = randomUUID();
  const memberConcurrentId = randomUUID();
  const memberFailureId = randomUUID();
  const memberLegacyId = randomUUID();
  const actor = (id) => ({id, role: "USER", status: "ACTIVE", emailVerified: true});
  const message = (body) => ({body, clientMessageId: randomUUID()});

  test("first contact creates one support reply, localised email notification, and a durable marker", async () => {
    try {
      await db.insert(schema.user).values([
        {id: adminId, name: "Support Admin", email: "support-admin@example.invalid", role: "ADMIN", emailVerified: true},
        {id: memberEnId, name: "English Member", email: "english-member@example.invalid", emailVerified: true, preferredLanguage: "en"},
        {id: memberEsId, name: "Spanish Member", email: "spanish-member@example.invalid", emailVerified: true, preferredLanguage: "es"},
        {id: memberConcurrentId, name: "Concurrent Member", email: "concurrent-member@example.invalid", emailVerified: true},
        {id: memberFailureId, name: "Failure Member", email: "failure-member@example.invalid", emailVerified: true},
        {id: memberLegacyId, name: "Legacy Member", email: "legacy-member@example.invalid", emailVerified: true},
      ]);
      process.env.PUBLIC_APP_URL = "https://weightpilot.example";

      const firstInput = message("First English message");
      const first = await sendMemberMessage(actor(memberEnId), firstInput);
      let rows = await sql`select sender_role, body from private_message where conversation_id = ${first.conversationId} order by created_at, id`;
      assert.equal(rows.length, 2);
      assert.equal(rows.filter((row) => row.sender_role === "ADMIN").length, 1);
      assert.match(rows.find((row) => row.sender_role === "ADMIN").body, /Thank you for contacting WeightPilot/u);
      assert.equal(globalThis.__messageNotifications.filter((notice) => notice.recipient === "english-member@example.invalid").length, 1);
      assert.equal(globalThis.__messageNotifications.filter((notice) => notice.recipient === "support-admin@example.invalid").length, 1);
      assert.equal(globalThis.__messageNotifications.find((notice) => notice.recipient === "english-member@example.invalid").url, "https://weightpilot.example/en/messages");
      const [marked] = await sql`select support_welcome_sent_at from message_conversation where id = ${first.conversationId}`;
      assert.ok(marked.support_welcome_sent_at);

      const retried = await sendMemberMessage(actor(memberEnId), firstInput);
      assert.equal(retried.created, false);
      assert.equal(globalThis.__messageNotifications.filter((notice) => notice.recipient === "english-member@example.invalid").length, 1);

      await sendMemberMessage(actor(memberEnId), message("Second English message"));
      rows = await sql`select sender_role from private_message where conversation_id = ${first.conversationId}`;
      assert.equal(rows.length, 3);
      assert.equal(rows.filter((row) => row.sender_role === "ADMIN").length, 1);
      assert.equal(globalThis.__messageNotifications.filter((notice) => notice.recipient === "english-member@example.invalid").length, 1);

      await sendAdminMessage({id: adminId, role: "ADMIN", status: "ACTIVE", emailVerified: true}, first.conversationId, message("Manual support reply"));
      assert.equal(globalThis.__messageNotifications.filter((notice) => notice.recipient === "english-member@example.invalid").length, 2);

      const spanish = await sendMemberMessage(actor(memberEsId), message("Primer mensaje"));
      const [reply] = await sql`select body from private_message where conversation_id = ${spanish.conversationId} and sender_role = 'ADMIN'`;
      assert.match(reply.body, /¡Gracias por contactar con WeightPilot!/u);
      assert.equal(globalThis.__messageNotifications.find((notice) => notice.recipient === "spanish-member@example.invalid").url, "https://weightpilot.example/es/messages");

      await Promise.all([
        sendMemberMessage(actor(memberConcurrentId), message("Concurrent A")),
        sendMemberMessage(actor(memberConcurrentId), message("Concurrent B")),
      ]);
      const [concurrent] = await sql`select id from message_conversation where member_id = ${memberConcurrentId}`;
      const concurrentRows = await sql`select sender_role from private_message where conversation_id = ${concurrent.id}`;
      assert.equal(concurrentRows.filter((row) => row.sender_role === "ADMIN").length, 1);
      assert.equal(globalThis.__messageNotifications.filter((notice) => notice.recipient === "concurrent-member@example.invalid").length, 1);

      globalThis.__failNotificationFor = "failure-member@example.invalid";
      const failedEmail = await sendMemberMessage(actor(memberFailureId), message("Original message survives"));
      assert.equal(failedEmail.created, true);
      let failureRows = await sql`select sender_role from private_message where conversation_id = ${failedEmail.conversationId}`;
      assert.equal(failureRows.length, 2);
      globalThis.__failNotificationFor = null;
      await sendMemberMessage(actor(memberFailureId), message("Later message repairs marker"));
      failureRows = await sql`select sender_role from private_message where conversation_id = ${failedEmail.conversationId}`;
      assert.equal(failureRows.filter((row) => row.sender_role === "ADMIN").length, 1);
      const [repaired] = await sql`select support_welcome_sent_at from message_conversation where id = ${failedEmail.conversationId}`;
      assert.ok(repaired.support_welcome_sent_at);

      const [legacy] = await db.insert(schema.messageConversation).values({memberId: memberLegacyId, supportWelcomeSentAt: new Date()}).returning({id: schema.messageConversation.id});
      await db.insert(schema.privateMessage).values({conversationId: legacy.id, senderId: adminId, senderRole: "ADMIN", clientMessageId: randomUUID(), body: "Older manual reply"});
      await sendMemberMessage(actor(memberLegacyId), message("Later legacy message"));
      const legacyRows = await sql`select sender_role from private_message where conversation_id = ${legacy.id}`;
      assert.equal(legacyRows.filter((row) => row.sender_role === "ADMIN").length, 1);
      assert.equal(globalThis.__messageNotifications.filter((notice) => notice.recipient === "legacy-member@example.invalid").length, 0);
    } finally {
      await sql`delete from "user" where id in (${adminId}, ${memberEnId}, ${memberEsId}, ${memberConcurrentId}, ${memberFailureId}, ${memberLegacyId})`;
      await sql.end({timeout: 5});
    }
  });
}
