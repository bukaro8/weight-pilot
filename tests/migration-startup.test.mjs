import assert from "node:assert/strict";
import {test} from "node:test";
import {mkdtemp, mkdir, writeFile, cp, symlink, rm, readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {randomUUID} from "node:crypto";
import {spawn} from "node:child_process";
import postgres from "postgres";
import {drizzle} from "drizzle-orm/postgres-js";
import {migrate} from "drizzle-orm/postgres-js/migrator";
import {readMigrationFiles} from "drizzle-orm/migrator";
import {runMigrations} from "../scripts/db-migrate-safe.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const testUrl = process.env.TEST_MIGRATION_DATABASE_URL;

function startup(cwd, databaseUrl) {
  return new Promise((resolve, reject) => {
    const child = spawn("sh", ["scripts/start-production.sh", process.execPath, "-e", 'console.log("WEB_STARTED")'], {
      cwd, env: {...process.env, DATABASE_URL: databaseUrl},
    });
    let output = "";
    child.stdout.on("data", (data) => { output += data; });
    child.stderr.on("data", (data) => { output += data; });
    child.on("error", reject);
    child.on("close", (code) => resolve({code, output}));
  });
}

test("startup fails closed without DATABASE_URL and does not print secrets", async () => {
  const result = await startup(root, "");
  assert.equal(result.code, 1);
  assert.match(result.output, /startup blocked/u);
  assert.doesNotMatch(result.output, /WEB_STARTED/u);
});

test("PostgreSQL migration/startup integration", {skip: !testUrl && "Set TEST_MIGRATION_DATABASE_URL to an isolated test PostgreSQL instance"}, async (t) => {
  const control = postgres(testUrl, {max: 1, onnotice: () => {}});
  t.after(() => control.end());

  async function fixture(t, statements) {
    const name = "wp_migration_test_" + randomUUID().replaceAll("-", "");
    await control.unsafe('create database "' + name + '"');
    const url = new URL(testUrl);
    url.pathname = "/" + name;
    const databaseUrl = url.toString();
    const sql = postgres(databaseUrl, {max: 1, onnotice: () => {}});
    const cwd = await mkdtemp(join(tmpdir(), "weightpilot-migrations-"));
    t.after(async () => {
      await sql.end();
      await control.unsafe('drop database "' + name + '"');
      await rm(cwd, {recursive: true, force: true});
    });
    await mkdir(join(cwd, "scripts"));
    for (const file of ["db-migrate-safe.mjs", "migration-safety.mjs", "start-production.sh"]) {
      await cp(join(root, "scripts", file), join(cwd, "scripts", file));
    }
    await symlink(join(root, "node_modules"), join(cwd, "node_modules"), "dir");
    const folder = join(cwd, "drizzle");
    await mkdir(join(folder, "meta"), {recursive: true});
    async function setMigrations(items) {
      const entries = items.map((_, i) => ({idx: i, version: "7", when: 1000 + i, tag: "test_" + i, breakpoints: true}));
      await writeFile(join(folder, "meta/_journal.json"), JSON.stringify({version: "7", dialect: "postgresql", entries}));
      await Promise.all(items.map((sql, i) => writeFile(join(folder, "test_" + i + ".sql"), sql)));
    }
    await setMigrations(statements);
    return {cwd, folder, databaseUrl, sql, setMigrations};
  }

  await t.test("pending migration applies, journal hashes match, repeat startup changes nothing", async (t) => {
    const f = await fixture(t, ["create table example (id integer);"]);
    const first = await startup(f.cwd, f.databaseUrl);
    assert.equal(first.code, 0);
    assert.match(first.output, /1 applied[\s\S]*WEB_STARTED/u);
    const before = await f.sql`select * from drizzle.__drizzle_migrations`;
    assert.equal(before[0].hash, readMigrationFiles({migrationsFolder: f.folder})[0].hash);
    const second = await startup(f.cwd, f.databaseUrl);
    assert.equal(second.code, 0);
    assert.match(second.output, /0 applied[\s\S]*WEB_STARTED/u);
    assert.deepEqual(await f.sql`select * from drizzle.__drizzle_migrations`, before);
  });

  await t.test("failed SQL rolls back pending changes and prevents web startup", async (t) => {
    const f = await fixture(t, ["create table example (id integer);"]);
    await runMigrations(f);
    await f.setMigrations(["create table example (id integer);", "create table rollback_probe (id integer); --> statement-breakpoint\nselect * from missing_private_table;"]);
    const result = await startup(f.cwd, f.databaseUrl);
    assert.equal(result.code, 1);
    assert.match(result.output, /startup blocked/u);
    assert.doesNotMatch(result.output, /WEB_STARTED|missing_private_table/u);
    assert.equal((await f.sql`select to_regclass('public.rollback_probe') as name`)[0].name, null);
    assert.equal((await f.sql`select count(*)::int as count from drizzle.__drizzle_migrations`)[0].count, 1);
  });

  await t.test("concurrent processes serialize and apply each migration exactly once", async (t) => {
    const f = await fixture(t, ["select pg_sleep(1); --> statement-breakpoint\ncreate table concurrent_probe (id integer);"]);
    const results = await Promise.all([startup(f.cwd, f.databaseUrl), startup(f.cwd, f.databaseUrl)]);
    assert.ok(results.every((result) => result.code === 0 && result.output.includes("WEB_STARTED")));
    assert.equal(results.filter((result) => result.output.includes("1 applied")).length, 1);
    assert.equal(results.filter((result) => result.output.includes("0 applied")).length, 1);
    assert.equal((await f.sql`select count(*)::int as count from drizzle.__drizzle_migrations`)[0].count, 1);
  });

  await t.test("legacy preflight preserves populated profiles and blocks startup", async (t) => {
    const f = await fixture(t, ['DROP TABLE "profiles" CASCADE;']);
    await f.sql`create table profiles (id integer)`;
    await f.sql`insert into profiles values (1)`;
    const result = await startup(f.cwd, f.databaseUrl);
    assert.equal(result.code, 1);
    assert.match(result.output, /non-empty legacy profiles/u);
    assert.doesNotMatch(result.output, /WEB_STARTED/u);
    assert.equal((await f.sql`select count(*)::int as count from profiles`)[0].count, 1);
  });

  await t.test("official Drizzle 0000–0010 history is preserved; only 0011 applies", async (t) => {
    const f = await fixture(t, []);
    await cp(join(root, "drizzle"), f.folder, {recursive: true});
    const journalPath = join(f.folder, "meta/_journal.json");
    const journal = JSON.parse(await readFile(journalPath, "utf8"));
    assert.equal(journal.entries.at(-1).tag, "0011_adorable_luke_cage");
    await writeFile(journalPath, JSON.stringify({...journal, entries: journal.entries.slice(0, -1)}));
    await migrate(drizzle(f.sql), {migrationsFolder: f.folder});
    const before = await f.sql`select * from drizzle.__drizzle_migrations order by id`;
    await writeFile(journalPath, JSON.stringify(journal));
    const result = await startup(f.cwd, f.databaseUrl);
    assert.equal(result.code, 0);
    assert.match(result.output, /1 applied[\s\S]*WEB_STARTED/u);
    const after = await f.sql`select * from drizzle.__drizzle_migrations order by id`;
    assert.deepEqual(after.slice(0, -1), [...before]);
    assert.equal(after.length, 12);
    assert.equal(await runMigrations(f), 0);
  });
});
