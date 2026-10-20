import "server-only";

export function assertTrustedMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = [
    new URL(request.url).origin,
    process.env.BETTER_AUTH_URL,
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") ?? []),
  ].filter((value): value is string => Boolean(value)).map((value) => value.replace(/\/$/, ""));

  if (!origin || !allowed.includes(origin.replace(/\/$/, ""))) throw new Error("UNTRUSTED_ORIGIN");
}
