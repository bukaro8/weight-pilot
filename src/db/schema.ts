import {relations, sql} from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["USER", "ADMIN"]);
export const userStatus = pgEnum("user_status", ["ACTIVE", "INACTIVE"]);
export const preferredLanguage = pgEnum("preferred_language", ["en", "es"]);
export const referralType = pgEnum("referral_type", ["REGISTRATION", "REACTIVATION"]);

export const user = pgTable(
  "user",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    preferredLanguage: preferredLanguage("preferred_language").notNull().default("en"),
    role: userRole("role").notNull().default("USER"),
    status: userStatus("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("user_single_admin_idx")
      .on(table.role)
      .where(sql`${table.role} = 'ADMIN'`),
  ],
);

export const session = pgTable(
  "session",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    expiresAt: timestamp("expires_at", {withTimezone: true}).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, {onDelete: "cascade"}),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, {onDelete: "cascade"}),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {withTimezone: true}),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {withTimezone: true}),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_idx").on(table.providerId, table.accountId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", {withTimezone: true}).notNull(),
    createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const rateLimit = pgTable(
  "rate_limit",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull().unique(),
    count: integer("count").notNull(),
    lastRequest: bigint("last_request", {mode: "number"}).notNull(),
  },
  (table) => [uniqueIndex("rate_limit_key_idx").on(table.key)],
);

export const invitation = pgTable(
  "invitation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    codeHash: text("code_hash").notNull().unique(),
    codeCiphertext: text("code_ciphertext").notNull(),
    codePreview: text("code_preview").notNull(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => user.id, {onDelete: "restrict"}),
    createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", {withTimezone: true}).notNull(),
    revokedAt: timestamp("revoked_at", {withTimezone: true}),
    redeemedAt: timestamp("redeemed_at", {withTimezone: true}),
    redeemedByUserId: uuid("redeemed_by_user_id").references(() => user.id, {onDelete: "restrict"}),
    redemptionType: referralType("redemption_type"),
  },
  (table) => [
    index("invitation_creator_id_idx").on(table.creatorId),
    index("invitation_redeemed_by_user_id_idx").on(table.redeemedByUserId),
    index("invitation_expires_at_idx").on(table.expiresAt),
  ],
);

export const referral = pgTable(
  "referral",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invitationId: uuid("invitation_id")
      .notNull()
      .unique()
      .references(() => invitation.id, {onDelete: "restrict"}),
    referrerUserId: uuid("referrer_user_id")
      .notNull()
      .references(() => user.id, {onDelete: "restrict"}),
    referredUserId: uuid("referred_user_id")
      .notNull()
      .references(() => user.id, {onDelete: "restrict"}),
    type: referralType("type").notNull(),
    createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [
    index("referral_referrer_user_id_idx").on(table.referrerUserId),
    index("referral_referred_user_id_idx").on(table.referredUserId),
  ],
);

export const userRelations = relations(user, ({many}) => ({
  sessions: many(session),
  accounts: many(account),
  createdInvitations: many(invitation, {relationName: "invitationCreator"}),
  redeemedInvitations: many(invitation, {relationName: "invitationRedeemer"}),
  referralsMade: many(referral, {relationName: "referralReferrer"}),
  referralsReceived: many(referral, {relationName: "referralReferred"}),
}));

export const sessionRelations = relations(session, ({one}) => ({
  user: one(user, {fields: [session.userId], references: [user.id]}),
}));

export const accountRelations = relations(account, ({one}) => ({
  user: one(user, {fields: [account.userId], references: [user.id]}),
}));

export const invitationRelations = relations(invitation, ({one}) => ({
  creator: one(user, {fields: [invitation.creatorId], references: [user.id], relationName: "invitationCreator"}),
  redeemedBy: one(user, {fields: [invitation.redeemedByUserId], references: [user.id], relationName: "invitationRedeemer"}),
  referral: one(referral),
}));

export const referralRelations = relations(referral, ({one}) => ({
  invitation: one(invitation, {fields: [referral.invitationId], references: [invitation.id]}),
  referrer: one(user, {fields: [referral.referrerUserId], references: [user.id], relationName: "referralReferrer"}),
  referred: one(user, {fields: [referral.referredUserId], references: [user.id], relationName: "referralReferred"}),
}));

export type AppUser = typeof user.$inferSelect;
