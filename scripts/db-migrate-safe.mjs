import {spawnSync} from "node:child_process";
import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import postgres from "postgres";

import {hasRiskyLegacyProfileDrop} from "./migration-safety.mjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const journalPath = fileURLToPath(new URL("../drizzle/meta/_journal.json", import.meta.url));
const journal = JSON.parse(await readFile(journalPath, "utf8"));
const sql = postgres(databaseUrl, {prepare: false, max: 1});

try {
  const [migrationTable] = await sql`select to_regclass('drizzle.__drizzle_migrations') as name`;
  let latestApplied = 0;
  if (migrationTable?.name) {
    const [latest] = await sql`select max(created_at)::bigint as created_at from drizzle.__drizzle_migrations`;
    latestApplied = Number(latest?.created_at ?? 0);
  }

  const pendingMigrations = await Promise.all(journal.entries
    .filter((entry) => entry.when > latestApplied)
    .map(async (entry) => ({
      tag: entry.tag,
      sql: await readFile(fileURLToPath(new URL(`../drizzle/${entry.tag}.sql`, import.meta.url)), "utf8"),
    })));

  const [profileTable] = await sql`select to_regclass('public.profiles') as name`;
  let profilesContainRows = false;
  if (profileTable?.name) {
    const [profileData] = await sql`select exists (select 1 from public.profiles limit 1) as has_rows`;
    profilesContainRows = profileData?.has_rows === true;
  }

  if (hasRiskyLegacyProfileDrop(pendingMigrations, profilesContainRows)) {
    throw new Error("Migration stopped before applying changes: pending migration 0001 drops a non-empty legacy profiles table. Back up and review that table before deciding how to preserve its records.");
  }
} finally {
  await sql.end();
}

const result = spawnSync(process.execPath, ["node_modules/drizzle-kit/bin.cjs", "migrate"], {stdio: "inherit"});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
