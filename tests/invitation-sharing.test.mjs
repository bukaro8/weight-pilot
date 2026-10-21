import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

import {invitationRegistrationLink, invitationShareMessage, publicInvitationOrigin, smsInvitationUrl, whatsappInvitationUrl} from "../src/features/invitations/sharing.ts";
import {renderInvitationEmail} from "../src/features/invitations/template.ts";

test("public invitation links use the configured HTTPS origin and preserve the code and locale", () => {
  assert.equal(publicInvitationOrigin("http://localhost:3000"), null);
  assert.equal(publicInvitationOrigin("http://127.0.0.1:3000"), null);
  assert.equal(publicInvitationOrigin("https://weightpilot.example.com"), "https://weightpilot.example.com");
  const link = invitationRegistrationLink("https://weightpilot.example.com", "es", "WP_ABC_123");
  const parsed = new URL(link);
  assert.equal(parsed.pathname, "/es/register");
  assert.equal(parsed.searchParams.get("code"), "WP_ABC_123");
});

test("English and Spanish invitation emails contain an escaped registration link", () => {
  for (const language of ["en", "es"]) {
    const link = invitationRegistrationLink("https://weightpilot.example.com", language, "WP_ABC_123");
    const email = renderInvitationEmail(language, link, invitationShareMessage(language, link));
    assert.match(email.html, /<html lang="(?:en|es)">/u);
    assert.match(email.html, /href="https:\/\/weightpilot\.example\.com\/(?:en|es)\/register\?code=WP_ABC_123"/u);
    assert.equal(email.text.includes(link), true);
    assert.equal(email.html.includes("localhost"), false);
  }
  const unsafe = renderInvitationEmail("en", "https://weightpilot.example.com/?x=\"<script>", "Safe invitation");
  assert.equal(unsafe.html.includes("<script>"), false);
  assert.match(unsafe.html, /&lt;script&gt;/u);
});

test("WhatsApp and SMS open recipient selection with the existing invitation link", () => {
  const link = invitationRegistrationLink("https://weightpilot.example.com", "en", "WP_ABC_123");
  const message = invitationShareMessage("en", link);
  const whatsapp = new URL(whatsappInvitationUrl(message));
  assert.equal(whatsapp.origin, "https://wa.me");
  assert.equal(whatsapp.pathname, "/");
  assert.equal(whatsapp.searchParams.get("text"), message);
  const sms = smsInvitationUrl(message);
  assert.equal(sms.startsWith("sms:?body="), true);
  assert.equal(decodeURIComponent(sms.split("body=")[1]), message);
  assert.match(invitationShareMessage("es", invitationRegistrationLink("https://weightpilot.example.com", "es", "WP_ABC_123")), /caduca a los 7 días de su creación/u);
});

test("invitation creation and sharing require an active verified owner and remain rate limited", async () => {
  const routes = await Promise.all([
    "../src/app/api/invitations/route.ts",
    "../src/app/api/invitations/[id]/email/route.ts",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")));
  assert.match(routes[0], /getAuthoritativeUser\(request\.headers\)/u);
  assert.match(routes[0], /canAccessPrivateServices\(currentUser\)/u);
  assert.match(routes[0], /enforceInvitationCreationLimit\(currentUser\.id\)/u);
  assert.match(routes[1], /getOwnedShareableInvitation\(id, currentUser\.id\)/u);
  assert.match(routes[1], /enforceInvitationEmailLimit\(currentUser\.id\)/u);
  assert.equal(routes[1].includes("createInvitation("), false);
  const memberPage = await readFile(new URL("../src/components/invitations/member-invitations.tsx", import.meta.url), "utf8");
  assert.equal(memberPage.includes("/api/invitations"), true);
  assert.equal(/\bitem\.code\b/u.test(memberPage), true);
});

test("admin creation stays in the admin workspace and member history is owner-scoped", async () => {
  const [adminPage, memberPage, adminUi, memberUi, server, header, dashboard] = await Promise.all([
    "../src/app/[locale]/(admin)/admin/invitations/page.tsx",
    "../src/app/[locale]/(member)/invitations/page.tsx",
    "../src/components/invitations/admin-invitations.tsx",
    "../src/components/invitations/member-invitations.tsx",
    "../src/features/invitations/server.ts",
    "../src/components/site-header.tsx",
    "../src/components/admin/admin-dashboard.tsx",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")));
  assert.match(adminPage, /requireAdmin\(locale/u);
  assert.match(memberPage, /requireMember\(locale/u);
  assert.match(memberPage, /currentUser\.role === "ADMIN"/u);
  assert.match(server, /\.where\(eq\(invitation\.creatorId, creatorId\)\)/u);
  assert.match(server, /invitationLifetimeMs = 7 \* 24 \* 60 \* 60 \* 1000/u);
  assert.match(server, /isNull\(invitation\.redeemedAt\)/u);
  assert.match(server, /gt\(invitation\.expiresAt, redeemedAt\)/u);
  assert.match(adminUi, /fetch\("\/api\/invitations", \{method: "POST"\}\)/u);
  assert.match(dashboard, /href="\/admin\/invitations"/u);
  assert.match(adminUi, /onClick=\{\(\) => void create\(\)\}/u);
  for (const action of ["emailAction", "whatsappAction", "smsAction", "copyLinkAction", "copyCode", "revoke"]) {
    assert.equal(adminUi.includes(action), true, `${action} is available in admin invitations`);
  }
  assert.equal(memberUi.includes("fetch("), true);
  assert.match(server, /if \(actor\.role !== "ADMIN"\) conditions\.push\(eq\(invitation\.creatorId, actor\.id\)\)/u);
  assert.match(memberUi, /communityTitle/u);
  assert.match(adminUi, /InvitationStatusTabs/u);
  assert.match(memberUi, /InvitationStatusTabs/u);
  assert.equal(adminUi.includes('useState<InvitationTabStatus>("ACTIVE")'), true);
  assert.equal(memberUi.includes('useState<InvitationTabStatus>("ACTIVE")'), true);
  assert.equal(adminUi.includes('status !== "REVOKED"'), true);
  assert.equal(memberUi.includes('status !== "REVOKED"'), true);
  assert.match(header, /session\?\.user\.role === "ADMIN"/u);
});
