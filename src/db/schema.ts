import {relations, sql} from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  primaryKey,
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
export const questionnaireStatus = pgEnum("questionnaire_status", ["DRAFT", "SUBMITTED"]);
export const measurementSystem = pgEnum("measurement_system", ["METRIC", "IMPERIAL"]);
export const questionnaireReviewStatus = pgEnum("questionnaire_review_status", ["REQUESTED", "IN_REVIEW", "COMPLETED"]);
export const reportSendStatus = pgEnum("report_send_status", ["DRAFT", "SENDING", "ACCEPTED", "DELIVERED", "FAILED"]);
export const reportAttemptStatus = pgEnum("report_attempt_status", ["ACCEPTED", "FAILED"]);
export const messageSenderRole = pgEnum("message_sender_role", ["USER", "ADMIN"]);
export const sexAssignedAtBirth = pgEnum("sex_assigned_at_birth", ["FEMALE", "MALE", "INTERSEX", "PREFER_NOT_TO_SAY"]);
export const referenceTreatment = pgEnum("reference_treatment", ["SEMAGLUTIDE", "TIRZEPATIDE"]);
export const referenceDeliveryMethod = pgEnum("reference_delivery_method", ["STANDARD_NEXT_DAY", "GUARANTEED_NEXT_DAY"]);
export const treatmentRequestStatus = pgEnum("treatment_request_status", ["SUBMITTED", "UNDER_REVIEW", "APPROVED_FOR_NEXT_STEPS", "DECLINED", "CANCELLED"]);

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

export const questionnaire = pgTable(
  "questionnaire",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, {onDelete: "cascade"}),
    status: questionnaireStatus("status").notNull().default("DRAFT"),
    currentStep: integer("current_step").notNull().default(1),
    measurementSystem: measurementSystem("measurement_system").notNull().default("METRIC"),
    age: integer("age"),
    sexAssignedAtBirth: sexAssignedAtBirth("sex_assigned_at_birth"),
    heightCm: numeric("height_cm", {precision: 5, scale: 1}),
    currentWeightKg: numeric("current_weight_kg", {precision: 5, scale: 1}),
    targetWeightKg: numeric("target_weight_kg", {precision: 5, scale: 1}),
    healthConditions: jsonb("health_conditions").$type<string[]>().notNull().default([]),
    medications: text("medications"),
    noMedication: boolean("no_medication").notNull().default(false),
    assessmentOutcome: jsonb("assessment_outcome").$type<unknown>(),
    assessmentVersion: integer("assessment_version"),
    createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", {withTimezone: true}),
  },
  (table) => [
    uniqueIndex("questionnaire_one_draft_per_user_idx").on(table.userId).where(sql`${table.status} = 'DRAFT'`),
    index("questionnaire_user_id_idx").on(table.userId),
    index("questionnaire_status_submitted_at_idx").on(table.status, table.submittedAt),
    check("questionnaire_current_step_check", sql`${table.currentStep} between 1 and 5`),
    check("questionnaire_submission_state_check", sql`(${table.status} = 'DRAFT' and ${table.submittedAt} is null) or (${table.status} = 'SUBMITTED' and ${table.submittedAt} is not null)`),
  ],
);

export const questionnaireReviewRequest = pgTable(
  "questionnaire_review_request",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionnaireId: uuid("questionnaire_id")
      .notNull()
      .unique()
      .references(() => questionnaire.id, {onDelete: "cascade"}),
    requestedByUserId: uuid("requested_by_user_id")
      .notNull()
      .references(() => user.id, {onDelete: "cascade"}),
    reportLanguage: preferredLanguage("report_language").notNull().default("en"),
    status: questionnaireReviewStatus("status").notNull().default("REQUESTED"),
    requestedAt: timestamp("requested_at", {withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow(),
    updatedByAdminId: uuid("updated_by_admin_id").references(() => user.id, {onDelete: "set null"}),
  },
  (table) => [
    index("questionnaire_review_request_status_idx").on(table.status, table.requestedAt),
    index("questionnaire_review_request_user_idx").on(table.requestedByUserId),
  ],
);

export const consultationReport = pgTable(
  "consultation_report",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reviewRequestId: uuid("review_request_id")
      .notNull()
      .unique()
      .references(() => questionnaireReviewRequest.id, {onDelete: "cascade"}),
    language: preferredLanguage("language").notNull().default("en"),
    content: text("content").notNull().default(""),
    referenceEstimate: jsonb("reference_estimate").$type<{
      treatment: "SEMAGLUTIDE" | "TIRZEPATIDE";
      durationMonths: 6 | 12 | 16;
      deliveryMethod: "STANDARD_NEXT_DAY" | "GUARANTEED_NEXT_DAY";
      treatmentCostPence: number;
      deliveryCostPence: number;
      totalCostPence: number;
      pricingUpdatedAt: string;
    } | null>(),
    pharmacyEstimate: jsonb("pharmacy_estimate").$type<{
      referencePriceId?: string;
      treatment: "SEMAGLUTIDE" | "TIRZEPATIDE";
      strength?: string;
      amountPence: number;
      periodMonths: number;
      sourceName: string;
      sourceUrl: string;
      asOfDate: string;
    } | null>(),
    savingsComparison: jsonb("savings_comparison").$type<{
      treatment: "SEMAGLUTIDE" | "TIRZEPATIDE";
      hypothetical: boolean;
      durationMonths: 16;
      weightPilotTreatmentCostPence: number;
      pharmacyTreatmentCostPence: number;
      differencePence: number;
      percentageLower: number;
      sourceName: string;
      sourceUrl: string;
      sourceReferenceDate: string;
      months: {month: number; strength: string; weightPilotPricePence: number; pharmacyPricePence: number}[];
    } | null>(),
    savingsComparisonEnabled: boolean("savings_comparison_enabled").notNull().default(false),
    sendStatus: reportSendStatus("send_status").notNull().default("DRAFT"),
    providerMessageId: text("provider_message_id").unique(),
    lastAttemptAt: timestamp("last_attempt_at", {withTimezone: true}),
    acceptedAt: timestamp("accepted_at", {withTimezone: true}),
    deliveredAt: timestamp("delivered_at", {withTimezone: true}),
    failedAt: timestamp("failed_at", {withTimezone: true}),
    failureCode: text("failure_code"),
    createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow(),
    updatedByAdminId: uuid("updated_by_admin_id").references(() => user.id, {onDelete: "set null"}),
    sentByAdminId: uuid("sent_by_admin_id").references(() => user.id, {onDelete: "set null"}),
  },
  (table) => [
    index("consultation_report_send_status_idx").on(table.sendStatus, table.updatedAt),
  ],
);

export const reportDeliveryAttempt = pgTable(
  "report_delivery_attempt",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => consultationReport.id, {onDelete: "cascade"}),
    status: reportAttemptStatus("status").notNull(),
    providerMessageId: text("provider_message_id"),
    failureCode: text("failure_code"),
    attemptedAt: timestamp("attempted_at", {withTimezone: true}).notNull().defaultNow(),
    adminId: uuid("admin_id").references(() => user.id, {onDelete: "set null"}),
  },
  (table) => [index("report_delivery_attempt_report_idx").on(table.reportId, table.attemptedAt)],
);

export const treatmentReferencePrice = pgTable(
  "treatment_reference_price",
  {
    treatment: referenceTreatment("treatment").notNull(),
    monthStart: integer("month_start").notNull(),
    pricePence: integer("price_pence").notNull(),
    updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow(),
    updatedByAdminId: uuid("updated_by_admin_id").references(() => user.id, {onDelete: "set null"}),
  },
  (table) => [
    primaryKey({columns: [table.treatment, table.monthStart]}),
    check("treatment_reference_price_month_check", sql`${table.monthStart} between 1 and 5`),
    check("treatment_reference_price_pence_check", sql`${table.pricePence} between 1 and 1000000`),
  ],
);

export const treatmentAccessRequest = pgTable("treatment_access_request", {
  id: uuid("id").defaultRandom().primaryKey(),
  memberId: uuid("member_id").notNull().references(() => user.id, {onDelete: "cascade"}),
  reportId: uuid("report_id").references(() => consultationReport.id, {onDelete: "set null"}),
  clientRequestId: uuid("client_request_id").notNull(),
  treatment: referenceTreatment("treatment").notNull(),
  approvedTreatment: referenceTreatment("approved_treatment"),
  approvedStrength: text("approved_strength"),
  approvalEmailProviderMessageId: text("approval_email_provider_message_id"),
  approvalEmailAcceptedAt: timestamp("approval_email_accepted_at", {withTimezone: true}),
  fullName: text("full_name").notNull(),
  address: text("address").notNull(),
  postcode: text("postcode").notNull(),
  telephone: text("telephone").notNull(),
  message: text("message"),
  language: preferredLanguage("language").notNull(),
  status: treatmentRequestStatus("status").notNull().default("SUBMITTED"),
  internalNote: text("internal_note"),
  declineReason: text("decline_reason"),
  createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("treatment_access_request_member_client_uidx").on(table.memberId, table.clientRequestId),
  index("treatment_access_request_member_date_idx").on(table.memberId, table.createdAt),
  index("treatment_access_request_status_date_idx").on(table.status, table.createdAt),
  check("treatment_access_request_name_check", sql`char_length(trim(${table.fullName})) between 2 and 160`),
  check("treatment_access_request_address_check", sql`char_length(trim(${table.address})) between 5 and 500`),
  check("treatment_access_request_postcode_check", sql`char_length(trim(${table.postcode})) between 3 and 30`),
  check("treatment_access_request_telephone_check", sql`char_length(trim(${table.telephone})) between 7 and 30`),
  check("treatment_access_request_message_check", sql`${table.message} is null or char_length(${table.message}) <= 1000`),
]);

export const treatmentRequestStatusEvent = pgTable("treatment_request_status_event", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").notNull().references(() => treatmentAccessRequest.id, {onDelete: "cascade"}),
  status: treatmentRequestStatus("status").notNull(),
  changedByUserId: uuid("changed_by_user_id").references(() => user.id, {onDelete: "set null"}),
  createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
}, (table) => [index("treatment_request_status_event_request_idx").on(table.requestId, table.createdAt)]);

export const deliveryReferencePrice = pgTable(
  "delivery_reference_price",
  {
    method: referenceDeliveryMethod("method").primaryKey(),
    pricePence: integer("price_pence").notNull(),
    updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow(),
    updatedByAdminId: uuid("updated_by_admin_id").references(() => user.id, {onDelete: "set null"}),
  },
  (table) => [
    check("delivery_reference_price_pence_check", sql`${table.pricePence} between 0 and 1000000`),
  ],
);

export const pharmacyReferenceSource = pgTable("pharmacy_reference_source", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  referenceDate: date("reference_date").notNull(),
  updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow(),
  updatedByAdminId: uuid("updated_by_admin_id").references(() => user.id, {onDelete: "set null"}),
});

export const pharmacyReferencePrice = pgTable("pharmacy_reference_price", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceId: uuid("source_id").notNull().references(() => pharmacyReferenceSource.id, {onDelete: "cascade"}),
  treatment: referenceTreatment("treatment").notNull(),
  strength: text("strength").notNull(),
  periodMonths: integer("period_months").notNull().default(1),
  pricePence: integer("price_pence").notNull(),
  updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow(),
  updatedByAdminId: uuid("updated_by_admin_id").references(() => user.id, {onDelete: "set null"}),
}, (table) => [
  uniqueIndex("pharmacy_reference_price_source_treatment_strength_period_unique").on(table.sourceId, table.treatment, table.strength, table.periodMonths),
  index("pharmacy_reference_price_treatment_strength_idx").on(table.treatment, table.strength),
  check("pharmacy_reference_price_period_check", sql`${table.periodMonths} between 1 and 24`),
  check("pharmacy_reference_price_pence_check", sql`${table.pricePence} between 1 and 1000000`),
]);

export const messageConversation = pgTable(
  "message_conversation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id").notNull().unique().references(() => user.id, {onDelete: "cascade"}),
    createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [index("message_conversation_updated_at_idx").on(table.updatedAt)],
);

export const privateMessage = pgTable(
  "private_message",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id").notNull().references(() => messageConversation.id, {onDelete: "cascade"}),
    senderId: uuid("sender_id").notNull().references(() => user.id, {onDelete: "cascade"}),
    senderRole: messageSenderRole("sender_role").notNull(),
    clientMessageId: uuid("client_message_id").notNull().unique(),
    body: text("body").notNull(),
    readAt: timestamp("read_at", {withTimezone: true}),
    createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [
    index("private_message_conversation_created_idx").on(table.conversationId, table.createdAt),
    index("private_message_unread_idx").on(table.conversationId, table.readAt, table.senderId),
    check("private_message_body_length_check", sql`char_length(trim(${table.body})) between 1 and 4000`),
  ],
);

export const userRelations = relations(user, ({many}) => ({
  sessions: many(session),
  accounts: many(account),
  createdInvitations: many(invitation, {relationName: "invitationCreator"}),
  redeemedInvitations: many(invitation, {relationName: "invitationRedeemer"}),
  referralsMade: many(referral, {relationName: "referralReferrer"}),
  referralsReceived: many(referral, {relationName: "referralReferred"}),
  questionnaires: many(questionnaire),
  questionnaireReviewRequests: many(questionnaireReviewRequest, {relationName: "reviewRequester"}),
  questionnaireReviewUpdates: many(questionnaireReviewRequest, {relationName: "reviewAdmin"}),
  reportDraftUpdates: many(consultationReport, {relationName: "reportUpdatedBy"}),
  reportsSent: many(consultationReport, {relationName: "reportSentBy"}),
  reportDeliveryAttempts: many(reportDeliveryAttempt),
  messageConversations: many(messageConversation),
  privateMessages: many(privateMessage),
  treatmentRequests: many(treatmentAccessRequest),
}));

export const messageConversationRelations = relations(messageConversation, ({one, many}) => ({
  member: one(user, {fields: [messageConversation.memberId], references: [user.id]}),
  messages: many(privateMessage),
}));

export const privateMessageRelations = relations(privateMessage, ({one}) => ({
  conversation: one(messageConversation, {fields: [privateMessage.conversationId], references: [messageConversation.id]}),
  sender: one(user, {fields: [privateMessage.senderId], references: [user.id]}),
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

export const questionnaireRelations = relations(questionnaire, ({one}) => ({
  user: one(user, {fields: [questionnaire.userId], references: [user.id]}),
  reviewRequest: one(questionnaireReviewRequest),
}));

export const questionnaireReviewRequestRelations = relations(questionnaireReviewRequest, ({one}) => ({
  questionnaire: one(questionnaire, {fields: [questionnaireReviewRequest.questionnaireId], references: [questionnaire.id]}),
  requester: one(user, {fields: [questionnaireReviewRequest.requestedByUserId], references: [user.id], relationName: "reviewRequester"}),
  updatedByAdmin: one(user, {fields: [questionnaireReviewRequest.updatedByAdminId], references: [user.id], relationName: "reviewAdmin"}),
  report: one(consultationReport),
}));

export const consultationReportRelations = relations(consultationReport, ({one, many}) => ({
  reviewRequest: one(questionnaireReviewRequest, {fields: [consultationReport.reviewRequestId], references: [questionnaireReviewRequest.id]}),
  updatedByAdmin: one(user, {fields: [consultationReport.updatedByAdminId], references: [user.id], relationName: "reportUpdatedBy"}),
  sentByAdmin: one(user, {fields: [consultationReport.sentByAdminId], references: [user.id], relationName: "reportSentBy"}),
  deliveryAttempts: many(reportDeliveryAttempt),
}));

export const reportDeliveryAttemptRelations = relations(reportDeliveryAttempt, ({one}) => ({
  report: one(consultationReport, {fields: [reportDeliveryAttempt.reportId], references: [consultationReport.id]}),
  admin: one(user, {fields: [reportDeliveryAttempt.adminId], references: [user.id]}),
}));

export type AppUser = typeof user.$inferSelect;
