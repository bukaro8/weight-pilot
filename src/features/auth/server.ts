import "server-only";

import {APIError} from "better-auth/api";
import {betterAuth} from "better-auth";
import {drizzleAdapter} from "better-auth/adapters/drizzle";
import {eq} from "drizzle-orm";

import {getDb} from "@/db";
import * as schema from "@/db/schema";
import {sendPasswordResetEmail, sendVerificationEmail} from "@/lib/email";
import {usesSecureAuthCookies} from "@/features/auth/config";

const isProductionBuild = process.env.npm_lifecycle_event === "build";
const baseURL = process.env.BETTER_AUTH_URL ?? (isProductionBuild ? "http://127.0.0.1:3000" : undefined);
const secret = process.env.BETTER_AUTH_SECRET ?? (isProductionBuild ? "weightpilot-build-only-secret-not-for-runtime" : undefined);

const trustedOrigins = [
  baseURL,
  ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") ?? []),
]
  .map((origin) => origin?.trim())
  .filter((origin): origin is string => Boolean(origin));

const trustProxyHeaders = process.env.AUTH_TRUST_PROXY_HEADERS === "true";

export const auth = betterAuth({
  appName: "WeightPilot",
  baseURL,
  secret,
  trustedOrigins,
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema,
    transaction: true,
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: true,
    autoSignIn: false,
    minPasswordLength: 9,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({user, url}) => {
      await sendPasswordResetEmail({userId: user.id, email: user.email, name: user.name, url});
    },
  },
  emailVerification: {
    sendOnSignUp: false,
    sendOnSignIn: true,
    autoSignInAfterVerification: false,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({user, url}) => {
      await sendVerificationEmail({userId: user.id, email: user.email, name: user.name, url});
    },
  },
  user: {
    deleteUser: {enabled: false},
    additionalFields: {
      preferredLanguage: {type: ["en", "es"], required: true, defaultValue: "en"},
      role: {type: ["USER", "ADMIN"], required: true, defaultValue: "USER", input: false},
      status: {type: ["ACTIVE", "INACTIVE"], required: true, defaultValue: "ACTIVE", input: false},
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    freshAge: 60 * 30,
    cookieCache: {enabled: false},
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": {window: 60, max: 5},
      "/request-password-reset": {window: 60, max: 3},
      "/reset-password": {window: 60, max: 5},
      "/send-verification-email": {window: 60, max: 3},
    },
  },
  advanced: {
    cookiePrefix: "weightpilot",
    // Docker uses a production Node runtime even during local HTTP testing.
    // Cookie transport security must follow the canonical public origin, not
    // NODE_ENV, otherwise the browser rejects a successful local session.
    useSecureCookies: usesSecureAuthCookies(baseURL),
    trustedProxyHeaders: trustProxyHeaders,
    ipAddress: trustProxyHeaders ? {ipAddressHeaders: ["cf-connecting-ip", "x-real-ip", "x-forwarded-for"]} : undefined,
    database: {generateId: "uuid"},
  },
  databaseHooks: {
    user: {
      create: {
        before: async () => {
          throw new APIError("FORBIDDEN", {message: "Account creation requires an invitation"});
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const [currentUser] = await getDb()
            .select({status: schema.user.status, emailVerified: schema.user.emailVerified})
            .from(schema.user)
            .where(eq(schema.user.id, session.userId))
            .limit(1);

          if (!currentUser || currentUser.status !== "ACTIVE" || !currentUser.emailVerified) {
            throw new APIError("FORBIDDEN", {message: "Account is not available"});
          }
        },
      },
    },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
