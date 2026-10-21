CREATE TYPE "public"."treatment_request_status" AS ENUM('SUBMITTED', 'UNDER_REVIEW', 'APPROVED_FOR_NEXT_STEPS', 'DECLINED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "treatment_access_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"report_id" uuid,
	"client_request_id" uuid NOT NULL,
	"treatment" "reference_treatment" NOT NULL,
	"full_name" text NOT NULL,
	"address" text NOT NULL,
	"postcode" text NOT NULL,
	"telephone" text NOT NULL,
	"message" text,
	"language" "preferred_language" NOT NULL,
	"status" "treatment_request_status" DEFAULT 'SUBMITTED' NOT NULL,
	"internal_note" text,
	"decline_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "treatment_access_request_name_check" CHECK (char_length(trim("treatment_access_request"."full_name")) between 2 and 160),
	CONSTRAINT "treatment_access_request_address_check" CHECK (char_length(trim("treatment_access_request"."address")) between 5 and 500),
	CONSTRAINT "treatment_access_request_postcode_check" CHECK (char_length(trim("treatment_access_request"."postcode")) between 3 and 30),
	CONSTRAINT "treatment_access_request_telephone_check" CHECK (char_length(trim("treatment_access_request"."telephone")) between 7 and 30),
	CONSTRAINT "treatment_access_request_message_check" CHECK ("treatment_access_request"."message" is null or char_length("treatment_access_request"."message") <= 1000)
);
--> statement-breakpoint
CREATE TABLE "treatment_request_status_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"status" "treatment_request_status" NOT NULL,
	"changed_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "treatment_access_request" ADD CONSTRAINT "treatment_access_request_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_access_request" ADD CONSTRAINT "treatment_access_request_report_id_consultation_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."consultation_report"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_request_status_event" ADD CONSTRAINT "treatment_request_status_event_request_id_treatment_access_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."treatment_access_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_request_status_event" ADD CONSTRAINT "treatment_request_status_event_changed_by_user_id_user_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "treatment_access_request_member_client_uidx" ON "treatment_access_request" USING btree ("member_id","client_request_id");--> statement-breakpoint
CREATE INDEX "treatment_access_request_member_date_idx" ON "treatment_access_request" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE INDEX "treatment_access_request_status_date_idx" ON "treatment_access_request" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "treatment_request_status_event_request_idx" ON "treatment_request_status_event" USING btree ("request_id","created_at");