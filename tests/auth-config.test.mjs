import assert from "node:assert/strict";
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
  assert.equal(postLoginDestination({role: "USER"}, "/consultations/results"), "/consultations/results");
  assert.equal(postLoginDestination({role: "USER"}, "//example.test"), "/consultations");
});
