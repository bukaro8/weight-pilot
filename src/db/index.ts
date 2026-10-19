import "server-only";
import {drizzle} from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

// postgres.js connects lazily. The fallback lets Next.js compile without live
// infrastructure; requests still fail closed until DATABASE_URL is configured.
const buildOnlyDatabaseUrl = "postgresql://build:build@127.0.0.1:5432/weightpilot_build";

export function getDb() {
  if (database) return database;
  const url = process.env.DATABASE_URL ?? buildOnlyDatabaseUrl;
  database = drizzle(postgres(url, {prepare: false}), {schema});
  return database;
}
