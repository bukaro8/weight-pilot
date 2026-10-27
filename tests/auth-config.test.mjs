import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

import {isLocalHttpAuthOrigin, usesSecureAuthCookies, withLocalAuthClientIp} from "../src/features/auth/config.ts";
import {postLoginDestination} from "../src/features/auth/destination.ts";
import {canAccessAdmin} from "../src/features/auth/policy.ts";

test("local production Docker HTTP uses non-secure session cookies", () => {
  assert.equal(usesSecureAuthCookies("http://localhost:3000", "production"), false);
  assert.equal(usesSecureAuthCookies("http://127.0.0.1:3000", "production"), false);
});

test("public HTTPS deployments keep secure session cookies", () => {
  assert.equal(usesSecureAuthCookies("https://weightpilot.example.com", "production"), true);
  assert.equal(isLocalHttpAuthOrigin("https://weightpilot.example.com"), false);
});

test("local auth requests receive a stable loopback rate-limit address", () => {
  const request = new Request("http://localhost:3000/api/auth/get-session", {headers: {"x-forwarded-for": "203.0.113.10"}});
  const adjusted = withLocalAuthClientIp(request, "http://localhost:3000");
  assert.equal(adjusted.headers.get("x-forwarded-for"), "127.0.0.1");
});

test("local auth request rewriting supports Next.js proxy-backed Requests", () => {
  const original = new Request("http://localhost:3000/api/auth/get-session", {
    headers: {cookie: "session=example", "x-forwarded-for": "203.0.113.10"},
  });
  const nextRequestProxy = new Proxy(original, {
    get(target, property) {
      return Reflect.get(target, property, target);
    },
  });

  const adjusted = withLocalAuthClientIp(nextRequestProxy, "http://localhost:3000");
  assert.equal(adjusted.url, original.url);
  assert.equal(adjusted.method, "GET");
  assert.equal(adjusted.headers.get("cookie"), "session=example");
  assert.equal(adjusted.headers.get("x-forwarded-for"), "127.0.0.1");
});

test("local auth request rewriting preserves POST bodies", async () => {
  const original = new Request("http://localhost:3000/api/auth/sign-in/email", {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({email: "member@example.test", password: "not-a-real-password"}),
  });

  const adjusted = withLocalAuthClientIp(original, "http://localhost:3000");
  assert.equal(adjusted.method, "POST");
  assert.equal(adjusted.headers.get("content-type"), "application/json");
  assert.equal(await adjusted.text(), JSON.stringify({email: "member@example.test", password: "not-a-real-password"}));
});

test("public requests are not rewritten", () => {
  const request = new Request("https://weightpilot.example.com/api/auth/get-session", {headers: {"cf-connecting-ip": "203.0.113.10"}});
  assert.equal(withLocalAuthClientIp(request, "https://weightpilot.example.com"), request);
});

test("only active, verified ADMIN accounts pass the admin policy", () => {
  assert.equal(canAccessAdmin({role: "ADMIN", status: "ACTIVE", emailVerified: true}), true);
  assert.equal(canAccessAdmin({role: "USER", status: "ACTIVE", emailVerified: true}), false);
  assert.equal(canAccessAdmin({role: "ADMIN", status: "INACTIVE", emailVerified: true}), false);
  assert.equal(canAccessAdmin({role: "ADMIN", status: "ACTIVE", emailVerified: false}), false);
});

test("post-login routing sends administrators to their dedicated dashboard", () => {
  assert.equal(postLoginDestination({role: "ADMIN"}, "/consultations"), "/admin");
  assert.equal(postLoginDestination({role: "USER"}), "/dashboard");
  assert.equal(postLoginDestination({role: "USER"}, "/dashboard"), "/dashboard");
  assert.equal(postLoginDestination({role: "USER"}, "/consultations/results"), "/consultations/results");
  assert.equal(postLoginDestination({role: "USER"}, "/reports/abc?tab=latest"), "/reports/abc?tab=latest");
  assert.equal(postLoginDestination({role: "USER"}, "/admin"), "/dashboard");
  assert.equal(postLoginDestination({role: "USER"}, "//example.test"), "/dashboard");
  assert.equal(postLoginDestination({role: "USER"}, "/\\\\example.test"), "/dashboard");
  assert.equal(postLoginDestination({role: "USER"}, "https://example.test"), "/dashboard");
  assert.equal(postLoginDestination({role: "USER"}, "/login"), "/dashboard");
});

test("email verification creates a session before routing to the correct dashboard", async () => {
  const [server, verificationPage, enMessages, esMessages] = await Promise.all([
    readFile(new URL("../src/features/auth/server.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/[locale]/(auth)/verify-email/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/messages/en.json", import.meta.url), "utf8"),
    readFile(new URL("../src/messages/es.json", import.meta.url), "utf8"),
  ]);
  assert.match(server, /autoSignInAfterVerification: true/u);
  assert.match(server, /currentUser\.status !== "ACTIVE" \|\| !currentUser\.emailVerified/u);
  assert.match(verificationPage, /getAuthoritativeUser\(\)/u);
  assert.match(verificationPage, /canAccessPrivateServices\(currentUser\)/u);
  assert.match(verificationPage, /postLoginDestination\(currentUser\)/u);
  assert.match(verificationPage, /redirect\(\{href: postLoginDestination\(currentUser\), locale\}\)/u);
  for (const messages of [JSON.parse(enMessages), JSON.parse(esMessages)]) {
    assert.ok(messages.auth.verificationSignInTitle);
    assert.ok(messages.auth.verificationSignInDescription);
  }
});

test("authenticated member header logo and dashboard navigation stay in the member workspace", async () => {
  const [header, signIn] = await Promise.all([
    readFile(new URL("../src/components/site-header.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/auth/sign-in-form.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(header, /const memberLinks = \[\["\/dashboard", "dashboard"\]/u);
  assert.match(header, /navigationKind === "member" \? "\/dashboard"/u);
  assert.match(header, /href=\{homeHref\}/u);
  assert.match(signIn, /fetch\(`\/api\/auth\/destination/u);
  assert.doesNotMatch(signIn, /router\.replace\(destinationBody\?\.destination \?\? "\/consultations"/u);
});
