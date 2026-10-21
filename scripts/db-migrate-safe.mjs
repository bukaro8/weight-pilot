import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
import postgres from "postgres";
import {readMigrationFiles} from "drizzle-orm/migrator";
import {hasRiskyLegacyProfileDrop} from "./migration-safety.mjs";

const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));

export async function runMigrations({databaseUrl = process.env.DATABASE_URL, folder = migrationsFolder} = {}) {
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  // Drizzle's reader preserves exact SQL hashes, timestamps and statement boundaries.
  const migrations = readMigrationFiles({migrationsFolder: folder});
  const sql = postgres(databaseUrl, {prepare: false, max: 1, connect_timeout: 15, onnotice: () => {}});
  try {
    return await sql.begin("isolation level read committed", async (tx) => {
      // Fixed application-wide key. Connection loss rolls back and releases the lock.
      await tx`set local lock_timeout = '120s'`;
      await tx`set local statement_timeout = '10min'`;
      await tx`select pg_advisory_xact_lock(1464881236, 1296648018)`;
      const [table] = await tx`select to_regclass('drizzle.__drizzle_migrations') as name`;
      let latestApplied = 0;
      if (table?.name) {
        const [latest] = await tx`select max(created_at)::bigint as created_at from drizzle.__drizzle_migrations`;
        latestApplied = Number(latest?.created_at ?? 0);
      }
      const pending = migrations.filter((migration) => migration.folderMillis > latestApplied);
      const [profiles] = await tx`select to_regclass('public.profiles') as name`;
      let profilesContainRows = false;
      if (profiles?.name) {
        const [data] = await tx`select exists (select 1 from public.profiles limit 1) as has_rows`;
        profilesContainRows = data?.has_rows === true;
      }
      if (hasRiskyLegacyProfileDrop(pending.map((migration) => ({sql: migration.sql.join("\n")})), profilesContainRows)) {
        throw new Error("LEGACY_PROFILES_NOT_EMPTY");
      }
      // Same journal and insert format as Drizzle's PostgreSQL migrator.
      // Journal creation is locked too, including on a completely empty database.
      await tx`create schema if not exists drizzle`;
      await tx`create table if not exists drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)`;
      for (const migration of pending) {
        for (const statement of migration.sql) await tx.unsafe(statement);
        await tx`insert into drizzle.__drizzle_migrations (hash, created_at) values (${migration.hash}, ${migration.folderMillis})`;
      }
      return pending.length;
    });
  } finally {
    await sql.end({timeout: 5});
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.info("Database migration preflight and lock acquisition starting.");
    const count = await runMigrations();
    console.info(`Database migrations complete: ${count} applied.`);
  } catch (error) {
    // Database errors can contain SQL, connection details or row values. Never log them.
    const reason = error.message === "LEGACY_PROFILES_NOT_EMPTY"
      ? "Pending migration would drop a non-empty legacy profiles table. Back up and review its records before retrying."
      : error.message === "DATABASE_URL is required"
        ? "DATABASE_URL is required."
        : "Check database connectivity, permissions, migration SQL and lock contention.";
    const code = /^[0-9A-Z]{5}$/u.test(error.code ?? "") ? ` (SQLSTATE ${error.code})` : "";
    console.error(`Database migrations failed${code}; application startup blocked. ${reason}`);
    process.exitCode = 1;
  }
}
