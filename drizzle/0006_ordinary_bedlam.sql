CREATE TYPE "public"."report_attempt_status" AS ENUM('ACCEPTED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."report_send_status" AS ENUM('DRAFT', 'SENDING', 'ACCEPTED', 'DELIVERED', 'FAILED');--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "report_delivery_attempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"status" "report_attempt_status" NOT NULL,
	"provider_message_id" text,
	"failure_code" text,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"admin_id" uuid
);
--> statement-breakpoint
ALTER TABLE "consultation_report" ADD CONSTRAINT "consultation_report_review_request_id_questionnaire_review_request_id_fk" FOREIGN KEY ("review_request_id") REFERENCES "public"."questionnaire_review_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_report" ADD CONSTRAINT "consultation_report_updated_by_admin_id_user_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_report" ADD CONSTRAINT "consultation_report_sent_by_admin_id_user_id_fk" FOREIGN KEY ("sent_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_delivery_attempt" ADD CONSTRAINT "report_delivery_attempt_report_id_consultation_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."consultation_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_delivery_attempt" ADD CONSTRAINT "report_delivery_attempt_admin_id_user_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consultation_report_send_status_idx" ON "consultation_report" USING btree ("send_status","updated_at");--> statement-breakpoint
CREATE INDEX "report_delivery_attempt_report_idx" ON "report_delivery_attempt" USING btree ("report_id","attempted_at");