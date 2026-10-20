CREATE TYPE "public"."questionnaire_review_status" AS ENUM('REQUESTED', 'IN_REVIEW', 'COMPLETED');--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "questionnaire" ADD COLUMN "assessment_outcome" jsonb;--> statement-breakpoint
ALTER TABLE "questionnaire" ADD COLUMN "assessment_version" integer;--> statement-breakpoint
ALTER TABLE "questionnaire_review_request" ADD CONSTRAINT "questionnaire_review_request_questionnaire_id_questionnaire_id_fk" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."questionnaire"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_review_request" ADD CONSTRAINT "questionnaire_review_request_requested_by_user_id_user_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_review_request" ADD CONSTRAINT "questionnaire_review_request_updated_by_admin_id_user_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "questionnaire_review_request_status_idx" ON "questionnaire_review_request" USING btree ("status","requested_at");--> statement-breakpoint
CREATE INDEX "questionnaire_review_request_user_idx" ON "questionnaire_review_request" USING btree ("requested_by_user_id");