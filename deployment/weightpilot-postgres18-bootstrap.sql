-- WeightPilot production PostgreSQL bootstrap (PostgreSQL 18 compatible)
-- Generated from drizzle/meta/_journal.json and the migration files listed below.
-- Includes Drizzle migrations 0000 through 0010, including messaging 0009.
-- Run only against the empty WeightPilot database, using psql --single-transaction.
-- Migration hashes below are SHA-256 of each original migration file, byte-for-byte.

CREATE SCHEMA IF NOT EXISTS "drizzle";

CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
  "id" SERIAL PRIMARY KEY,
  "hash" text NOT NULL,
  "created_at" bigint
);

DO $weightpilot_empty_database_guard$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations") THEN
    RAISE EXCEPTION 'Drizzle migration records already exist; refusing to apply this bootstrap file';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_tables WHERE schemaname = 'public') THEN
    RAISE EXCEPTION 'The public schema is not empty; refusing to apply this bootstrap file';
  END IF;
END
$weightpilot_empty_database_guard$;

-- 0000_yummy_blindfold; journal timestamp 1792359876840; original SHA-256 231967da709f0e6a14a35056f6baa2dfcc7e282c60c125fdb74691f5835daa58
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_auth_user_id_unique" UNIQUE("auth_user_id")
);

-- 0001_wet_the_order; journal timestamp 1792387211591; original SHA-256 7e165c7cdc269a5aba80b31689591c14e5eee1f2fdacadcdf2d38e69eeef302a
CREATE TYPE "public"."preferred_language" AS ENUM('en', 'es');
CREATE TYPE "public"."user_role" AS ENUM('USER', 'ADMIN');
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'INACTIVE');
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "rate_limit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);

CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);

CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"preferred_language" "preferred_language" DEFAULT 'en' NOT NULL,
	"role" "user_role" DEFAULT 'USER' NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);

CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DROP TABLE "profiles" CASCADE;
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");
CREATE UNIQUE INDEX "account_provider_account_idx" ON "account" USING btree ("provider_id","account_id");
CREATE UNIQUE INDEX "rate_limit_key_idx" ON "rate_limit" USING btree ("key");
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");
CREATE UNIQUE INDEX "user_single_admin_idx" ON "user" USING btree ("role") WHERE "user"."role" = 'ADMIN';
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");

-- 0002_dark_storm; journal timestamp 1792389143049; original SHA-256 d696db97b8f512a04c2c4242f58376dce5f29cd845bebb3a1e8d9f759683b263
CREATE TYPE "public"."referral_type" AS ENUM('REGISTRATION', 'REACTIVATION');
CREATE TABLE "invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_hash" text NOT NULL,
	"code_ciphertext" text NOT NULL,
	"code_preview" text NOT NULL,
	"creator_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"redeemed_at" timestamp with time zone,
	"redeemed_by_user_id" uuid,
	"redemption_type" "referral_type",
	CONSTRAINT "invitation_code_hash_unique" UNIQUE("code_hash")
);

CREATE TABLE "referral" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invitation_id" uuid NOT NULL,
	"referrer_user_id" uuid NOT NULL,
	"referred_user_id" uuid NOT NULL,
	"type" "referral_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_invitation_id_unique" UNIQUE("invitation_id")
);

ALTER TABLE "invitation" ADD CONSTRAINT "invitation_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_redeemed_by_user_id_user_id_fk" FOREIGN KEY ("redeemed_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "referral" ADD CONSTRAINT "referral_invitation_id_invitation_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitation"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "referral" ADD CONSTRAINT "referral_referrer_user_id_user_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "referral" ADD CONSTRAINT "referral_referred_user_id_user_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
CREATE INDEX "invitation_creator_id_idx" ON "invitation" USING btree ("creator_id");
CREATE INDEX "invitation_redeemed_by_user_id_idx" ON "invitation" USING btree ("redeemed_by_user_id");
CREATE INDEX "invitation_expires_at_idx" ON "invitation" USING btree ("expires_at");
CREATE INDEX "referral_referrer_user_id_idx" ON "referral" USING btree ("referrer_user_id");
CREATE INDEX "referral_referred_user_id_idx" ON "referral" USING btree ("referred_user_id");

-- 0003_slippery_silver_samurai; journal timestamp 1792416235829; original SHA-256 6533a676b1c2e6720bfe4e467e18e3fca1edb6f5b845b4b032454375685d8547
CREATE TYPE "public"."questionnaire_status" AS ENUM('DRAFT', 'SUBMITTED');
CREATE TYPE "public"."sex_assigned_at_birth" AS ENUM('FEMALE', 'MALE', 'INTERSEX', 'PREFER_NOT_TO_SAY');
CREATE TABLE "questionnaire" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "questionnaire_status" DEFAULT 'DRAFT' NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"age" integer,
	"sex_assigned_at_birth" "sex_assigned_at_birth",
	"height_cm" numeric(5, 1),
	"current_weight_kg" numeric(5, 1),
	"target_weight_kg" numeric(5, 1),
	"health_conditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"medications" text,
	"no_medication" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	CONSTRAINT "questionnaire_current_step_check" CHECK ("questionnaire"."current_step" between 1 and 5),
	CONSTRAINT "questionnaire_submission_state_check" CHECK (("questionnaire"."status" = 'DRAFT' and "questionnaire"."submitted_at" is null) or ("questionnaire"."status" = 'SUBMITTED' and "questionnaire"."submitted_at" is not null))
);

ALTER TABLE "questionnaire" ADD CONSTRAINT "questionnaire_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "questionnaire_one_draft_per_user_idx" ON "questionnaire" USING btree ("user_id") WHERE "questionnaire"."status" = 'DRAFT';
CREATE INDEX "questionnaire_user_id_idx" ON "questionnaire" USING btree ("user_id");
CREATE INDEX "questionnaire_status_submitted_at_idx" ON "questionnaire" USING btree ("status","submitted_at");

-- 0004_tan_marvel_boy; journal timestamp 1792418870985; original SHA-256 b4207fd30e4d566d764f725fe6f531c69fce0bfe94f220e5b4b346812d5dac6d
CREATE TYPE "public"."reference_delivery_method" AS ENUM('STANDARD_NEXT_DAY', 'GUARANTEED_NEXT_DAY');
CREATE TYPE "public"."reference_treatment" AS ENUM('SEMAGLUTIDE', 'TIRZEPATIDE');
CREATE TABLE "delivery_reference_price" (
	"method" "reference_delivery_method" PRIMARY KEY NOT NULL,
	"price_pence" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_admin_id" uuid,
	CONSTRAINT "delivery_reference_price_pence_check" CHECK ("delivery_reference_price"."price_pence" between 0 and 1000000)
);

CREATE TABLE "treatment_reference_price" (
	"treatment" "reference_treatment" NOT NULL,
	"month_start" integer NOT NULL,
	"price_pence" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_admin_id" uuid,
	CONSTRAINT "treatment_reference_price_treatment_month_start_pk" PRIMARY KEY("treatment","month_start"),
	CONSTRAINT "treatment_reference_price_month_check" CHECK ("treatment_reference_price"."month_start" between 1 and 5),
	CONSTRAINT "treatment_reference_price_pence_check" CHECK ("treatment_reference_price"."price_pence" between 1 and 1000000)
);

ALTER TABLE "delivery_reference_price" ADD CONSTRAINT "delivery_reference_price_updated_by_admin_id_user_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "treatment_reference_price" ADD CONSTRAINT "treatment_reference_price_updated_by_admin_id_user_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;

-- 0005_reflective_hex; journal timestamp 1792440517992; original SHA-256 edc532737b82d5cc45dd8212b390001cb6f2fd20b112c288d7d29688d1e7afe9
CREATE TYPE "public"."questionnaire_review_status" AS ENUM('REQUESTED', 'IN_REVIEW', 'COMPLETED');
CREATE TABLE "questionnaire_review_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"questionnaire_id" uuid NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"status" "questionnaire_review_status" DEFAULT 'REQUESTED' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_admin_id" uuid,
	CONSTRAINT "questionnaire_review_request_questionnaire_id_unique" UNIQUE("questionnaire_id")
);

ALTER TABLE "questionnaire" ADD COLUMN "assessment_outcome" jsonb;
ALTER TABLE "questionnaire" ADD COLUMN "assessment_version" integer;
ALTER TABLE "questionnaire_review_request" ADD CONSTRAINT "questionnaire_review_request_questionnaire_id_questionnaire_id_fk" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."questionnaire"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "questionnaire_review_request" ADD CONSTRAINT "questionnaire_review_request_requested_by_user_id_user_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "questionnaire_review_request" ADD CONSTRAINT "questionnaire_review_request_updated_by_admin_id_user_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "questionnaire_review_request_status_idx" ON "questionnaire_review_request" USING btree ("status","requested_at");
CREATE INDEX "questionnaire_review_request_user_idx" ON "questionnaire_review_request" USING btree ("requested_by_user_id");

-- 0006_ordinary_bedlam; journal timestamp 1792441418483; original SHA-256 1fd241767174d89363a7d0631471f88bc2bb502a5919d454a66a03805ca43c08
CREATE TYPE "public"."report_attempt_status" AS ENUM('ACCEPTED', 'FAILED');
CREATE TYPE "public"."report_send_status" AS ENUM('DRAFT', 'SENDING', 'ACCEPTED', 'DELIVERED', 'FAILED');
CREATE TABLE "consultation_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_request_id" uuid NOT NULL,
	"language" "preferred_language" DEFAULT 'en' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"send_status" "report_send_status" DEFAULT 'DRAFT' NOT NULL,
	"provider_message_id" text,
	"last_attempt_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_admin_id" uuid,
	"sent_by_admin_id" uuid,
	CONSTRAINT "consultation_report_review_request_id_unique" UNIQUE("review_request_id"),
	CONSTRAINT "consultation_report_provider_message_id_unique" UNIQUE("provider_message_id")
);

CREATE TABLE "report_delivery_attempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"status" "report_attempt_status" NOT NULL,
	"provider_message_id" text,
	"failure_code" text,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"admin_id" uuid
);

ALTER TABLE "consultation_report" ADD CONSTRAINT "consultation_report_review_request_id_questionnaire_review_request_id_fk" FOREIGN KEY ("review_request_id") REFERENCES "public"."questionnaire_review_request"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "consultation_report" ADD CONSTRAINT "consultation_report_updated_by_admin_id_user_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "consultation_report" ADD CONSTRAINT "consultation_report_sent_by_admin_id_user_id_fk" FOREIGN KEY ("sent_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "report_delivery_attempt" ADD CONSTRAINT "report_delivery_attempt_report_id_consultation_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."consultation_report"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "report_delivery_attempt" ADD CONSTRAINT "report_delivery_attempt_admin_id_user_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "consultation_report_send_status_idx" ON "consultation_report" USING btree ("send_status","updated_at");
CREATE INDEX "report_delivery_attempt_report_idx" ON "report_delivery_attempt" USING btree ("report_id","attempted_at");

-- 0007_young_mandrill; journal timestamp 1792475347072; original SHA-256 c1b7c526a9822472fb7155216b16d8b754fba30e09f5e5a4aa44a0db793aecf2
CREATE TYPE "public"."measurement_system" AS ENUM('METRIC', 'IMPERIAL');
ALTER TABLE "questionnaire" ADD COLUMN "measurement_system" "measurement_system" DEFAULT 'METRIC' NOT NULL;

-- 0008_friendly_king_cobra; journal timestamp 1792501985330; original SHA-256 453cae7c1f1eb0cabed8d7867284617ecf45ada268ffdbc36172ac91e3044719
ALTER TABLE "questionnaire_review_request" ADD COLUMN "report_language" "preferred_language";
UPDATE "questionnaire_review_request" AS "request"
SET "report_language" = COALESCE(
  (SELECT "language" FROM "consultation_report" WHERE "review_request_id" = "request"."id"),
  (SELECT "preferred_language" FROM "user" WHERE "id" = "request"."requested_by_user_id"),
  'en'::"preferred_language"
);
ALTER TABLE "questionnaire_review_request" ALTER COLUMN "report_language" SET DEFAULT 'en';
ALTER TABLE "questionnaire_review_request" ALTER COLUMN "report_language" SET NOT NULL;

-- 0009_neat_emma_frost; journal timestamp 1792560952198; original SHA-256 b5a2723899d0cc4c8d2361ae42312ca7d3cf011585e69fd0fd29b7b36137fccb
CREATE TYPE "public"."message_sender_role" AS ENUM('USER', 'ADMIN');
CREATE TABLE "message_conversation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_conversation_member_id_unique" UNIQUE("member_id")
);

CREATE TABLE "private_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"sender_role" "message_sender_role" NOT NULL,
	"client_message_id" uuid NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "private_message_client_message_id_unique" UNIQUE("client_message_id"),
	CONSTRAINT "private_message_body_length_check" CHECK (char_length(trim("private_message"."body")) between 1 and 4000)
);

ALTER TABLE "message_conversation" ADD CONSTRAINT "message_conversation_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "private_message" ADD CONSTRAINT "private_message_conversation_id_message_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."message_conversation"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "private_message" ADD CONSTRAINT "private_message_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "message_conversation_updated_at_idx" ON "message_conversation" USING btree ("updated_at");
CREATE INDEX "private_message_conversation_created_idx" ON "private_message" USING btree ("conversation_id","created_at");
CREATE INDEX "private_message_unread_idx" ON "private_message" USING btree ("conversation_id","read_at","sender_id");

-- 0010_high_freak; journal timestamp 1792562262508; original SHA-256 df897e5bac615907ed39b0ede36f4036201a5a149d5eb114c4051dbcb8593d04
ALTER TABLE "consultation_report" ADD COLUMN "reference_estimate" jsonb;
ALTER TABLE "consultation_report" ADD COLUMN "pharmacy_estimate" jsonb;

-- Record the exact journal timestamps and source-file hashes so Drizzle skips these migrations later.
INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") VALUES
  ('231967da709f0e6a14a35056f6baa2dfcc7e282c60c125fdb74691f5835daa58', 1792359876840),
  ('7e165c7cdc269a5aba80b31689591c14e5eee1f2fdacadcdf2d38e69eeef302a', 1792387211591),
  ('d696db97b8f512a04c2c4242f58376dce5f29cd845bebb3a1e8d9f759683b263', 1792389143049),
  ('6533a676b1c2e6720bfe4e467e18e3fca1edb6f5b845b4b032454375685d8547', 1792416235829),
  ('b4207fd30e4d566d764f725fe6f531c69fce0bfe94f220e5b4b346812d5dac6d', 1792418870985),
  ('edc532737b82d5cc45dd8212b390001cb6f2fd20b112c288d7d29688d1e7afe9', 1792440517992),
  ('1fd241767174d89363a7d0631471f88bc2bb502a5919d454a66a03805ca43c08', 1792441418483),
  ('c1b7c526a9822472fb7155216b16d8b754fba30e09f5e5a4aa44a0db793aecf2', 1792475347072),
  ('453cae7c1f1eb0cabed8d7867284617ecf45ada268ffdbc36172ac91e3044719', 1792501985330),
  ('b5a2723899d0cc4c8d2361ae42312ca7d3cf011585e69fd0fd29b7b36137fccb', 1792560952198),
  ('df897e5bac615907ed39b0ede36f4036201a5a149d5eb114c4051dbcb8593d04', 1792562262508);

