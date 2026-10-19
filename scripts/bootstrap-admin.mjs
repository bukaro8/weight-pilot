import {randomUUID} from "node:crypto";

import {hashPassword} from "better-auth/crypto";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const name = process.env.ADMIN_NAME?.trim();
const password = process.env.ADMIN_PASSWORD;
const preferredLanguage = process.env.ADMIN_PREFERRED_LANGUAGE === "es" ? "es" : "en";

if (!databaseUrl) throw new Error("DATABASE_URL is required");
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("ADMIN_EMAIL must be a valid email address");
if (!name || name.length < 2 || name.length > 120) throw new Error("ADMIN_NAME must contain 2–120 characters");
if (!password || password.length < 12 || password.length > 128) throw new Error("ADMIN_PASSWORD must contain 12–128 characters");

const sql = postgres(databaseUrl, {prepare: false, max: 1});

try {
  const passwordHash = await hashPassword(password);
  const userId = randomUUID();
  const accountId = randomUUID();

  await sql.begin(async (transaction) => {
    await transaction`select pg_advisory_xact_lock(hashtext('weightpilot-initial-admin'))`;
    const [existingAdmin] = await transaction`select id from "user" where role = 'ADMIN' limit 1`;
    if (existingAdmin) throw new Error("An administrator already exists. No changes were made.");

    const [existingEmail] = await transaction`select id from "user" where lower(email) = ${email} limit 1`;
    if (existingEmail) throw new Error("That email is already associated with an account. No changes were made.");

    await transaction`
      insert into "user" (id, name, email, email_verified, preferred_language, role, status, created_at, updated_at)
      values (${userId}, ${name}, ${email}, false, ${preferredLanguage}, 'ADMIN', 'ACTIVE', now(), now())
    `;
    await transaction`
      insert into account (id, account_id, provider_id, user_id, password, created_at, updated_at)
      values (${accountId}, ${userId}, 'credential', ${userId}, ${passwordHash}, now(), now())
    `;
  });

  console.log("Initial administrator created. Sign in once to receive the mandatory email-verification link.");
} finally {
  await sql.end();
}
