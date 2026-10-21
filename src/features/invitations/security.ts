import "server-only";

import {createHash} from "node:crypto";

import {sql} from "drizzle-orm";

import {getDb} from "@/db";
export {assertTrustedMutationOrigin} from "@/lib/request-security";

export class InvitationRateLimitError extends Error {
  constructor() {
    super("INVITATION_RATE_LIMITED");
  }
}

export function invitationCodeHash(code: string) {
  return createHash("sha256").update(code.trim(), "utf8").digest("hex");
}

function requestFingerprint(request: Request) {
  const forwarded = process.env.AUTH_TRUST_PROXY_HEADERS === "true"
    ? request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip")
    : null;
  const source = [forwarded ?? "unknown", request.headers.get("user-agent") ?? "unknown"].join("|");
  return createHash("sha256").update(source).digest("hex");
}

async function consumeRateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const result = await getDb().execute(sql`
    insert into "rate_limit" ("key", "count", "last_request")
    values (${key}, 1, ${now})
    on conflict ("key") do update set
      "count" = case
        when ${now} - "rate_limit"."last_request" > ${windowMs} then 1
        else "rate_limit"."count" + 1
      end,
      "last_request" = case
        when ${now} - "rate_limit"."last_request" > ${windowMs} then ${now}
        else "rate_limit"."last_request"
      end
    returning "count"
  `);
  const count = Number((result[0] as {count: number | string} | undefined)?.count ?? max + 1);
  if (count > max) throw new InvitationRateLimitError();
}

export async function enforceInvitationRedemptionLimit(request: Request, identifier: string) {
  const identifierHash = createHash("sha256").update(identifier.trim().toLowerCase()).digest("hex");
  await consumeRateLimit(`invitation:address:${requestFingerprint(request)}`, 20, 10 * 60 * 1000);
  await consumeRateLimit(`invitation:identity:${identifierHash}`, 10, 10 * 60 * 1000);
}

export async function enforceInvitationCreationLimit(userId: string) {
  await consumeRateLimit(`invitation:create:${userId}`, 10, 60 * 60 * 1000);
}

export async function enforceInvitationEmailLimit(userId: string) {
  await consumeRateLimit(`invitation:email:${userId}`, 10, 10 * 60 * 1000);
}
