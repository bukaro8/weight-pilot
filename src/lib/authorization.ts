import "server-only";

import {eq} from "drizzle-orm";
import {headers} from "next/headers";

import {getDb} from "@/db";
import {user} from "@/db/schema";
import {auth} from "@/features/auth/server";
import {canAccessAdmin, canAccessPrivateServices} from "@/features/auth/policy";
import {redirect} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";

export async function getAuthoritativeUser(requestHeaders?: Headers) {
  const session = await auth.api.getSession({headers: requestHeaders ?? await headers()});
  if (!session) return null;

  const [record] = await getDb().select().from(user).where(eq(user.id, session.user.id)).limit(1);
  return record ?? null;
}

export async function requireMember(locale: Locale, nextPath: string) {
  const currentUser = await getAuthoritativeUser();
  if (!currentUser) {
    return redirect({href: {pathname: "/login", query: {next: nextPath}}, locale});
  }
  if (!canAccessPrivateServices(currentUser)) {
    return redirect({href: {pathname: "/auth-error", query: {reason: currentUser.status === "INACTIVE" ? "inactive" : "unverified"}}, locale});
  }
  return currentUser;
}

export async function requireAdmin(locale: Locale) {
  const currentUser = await requireMember(locale, "/admin");
  if (!canAccessAdmin(currentUser)) {
    return redirect({href: {pathname: "/auth-error", query: {reason: "forbidden"}}, locale});
  }
  return currentUser;
}
