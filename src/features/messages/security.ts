import "server-only";

import {createHash} from "node:crypto";
import {sql} from "drizzle-orm";
import {getDb} from "@/db";

export class MessageRateLimitError extends Error {
  constructor() { super("MESSAGE_RATE_LIMITED"); }
}

async function consumeMessageLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const result = await getDb().execute(sql`
    insert into "rate_limit" ("key", "count", "last_request") values (${key}, 1, ${now})
    on conflict ("key") do update set
      "count" = case when ${now} - "rate_limit"."last_request" > ${windowMs} then 1 else "rate_limit"."count" + 1 end,
      "last_request" = case when ${now} - "rate_limit"."last_request" > ${windowMs} then ${now} else "rate_limit"."last_request" end
    returning "count"
  `);
  if (Number((result[0] as {count: number | string} | undefined)?.count ?? max + 1) > max) throw new MessageRateLimitError();
}

export async function enforceMessageSendLimit(userId: string) {
  const identity = createHash("sha256").update(userId).digest("hex");
  await consumeMessageLimit(`message:send:10m:${identity}`, 30, 10 * 60 * 1000);
  await consumeMessageLimit(`message:send:1h:${identity}`, 120, 60 * 60 * 1000);
}
