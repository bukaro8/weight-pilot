import "server-only";

import {getDb} from "@/db";
import {StructuredAssessmentError, fetchStructuredAssessment} from "@/features/reports/structured-assessment";
import {sql} from "drizzle-orm";

// Only an explicit administrator action calls this provider. No response is
// saved, shown to members, or sent by email until the existing review flow.
export async function requestStructuredAssessment(prompt: string, adminId: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new StructuredAssessmentError("OPENAI_NOT_CONFIGURED");

  const now = Date.now();
  const limit = await getDb().execute(sql`
    insert into "rate_limit" ("key", "count", "last_request")
    values (${`report:ai:${adminId}`}, 1, ${now})
    on conflict ("key") do update set
      "count" = case when ${now} - "rate_limit"."last_request" > ${60 * 60 * 1000} then 1 else "rate_limit"."count" + 1 end,
      "last_request" = case when ${now} - "rate_limit"."last_request" > ${60 * 60 * 1000} then ${now} else "rate_limit"."last_request" end
    returning "count"
  `);
  if (Number((limit[0] as {count: number | string} | undefined)?.count ?? 21) > 20) {
    throw new StructuredAssessmentError("OPENAI_RATE_LIMITED");
  }
  return fetchStructuredAssessment({prompt, apiKey: key, model: process.env.OPENAI_MODEL || "gpt-4o"});
}
