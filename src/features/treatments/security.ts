import "server-only";
import {createHash} from "node:crypto";
import {sql} from "drizzle-orm";
import {getDb} from "@/db";

export async function enforceTreatmentRequestLimit(userId: string) {
  const key = `treatment:request:day:${createHash("sha256").update(userId).digest("hex")}`;
  const now = Date.now();
  const rows = await getDb().execute(sql`
    insert into "rate_limit" ("key", "count", "last_request") values (${key}, 1, ${now})
    on conflict ("key") do update set
      "count" = case when ${now} - "rate_limit"."last_request" > 86400000 then 1 else "rate_limit"."count" + 1 end,
      "last_request" = case when ${now} - "rate_limit"."last_request" > 86400000 then ${now} else "rate_limit"."last_request" end
    returning "count"
  `);
  if (Number((rows[0] as {count: number | string} | undefined)?.count ?? 6) > 5) throw new Error("REQUEST_RATE_LIMITED");
}
