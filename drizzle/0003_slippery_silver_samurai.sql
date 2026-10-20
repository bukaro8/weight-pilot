CREATE TYPE "public"."questionnaire_status" AS ENUM('DRAFT', 'SUBMITTED');--> statement-breakpoint
CREATE TYPE "public"."sex_assigned_at_birth" AS ENUM('FEMALE', 'MALE', 'INTERSEX', 'PREFER_NOT_TO_SAY');--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "questionnaire" ADD CONSTRAINT "questionnaire_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "questionnaire_one_draft_per_user_idx" ON "questionnaire" USING btree ("user_id") WHERE "questionnaire"."status" = 'DRAFT';--> statement-breakpoint
CREATE INDEX "questionnaire_user_id_idx" ON "questionnaire" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "questionnaire_status_submitted_at_idx" ON "questionnaire" USING btree ("status","submitted_at");