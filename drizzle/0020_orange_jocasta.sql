CREATE TYPE "public"."follow_up_category" AS ENUM('INCOMPLETE_ASSESSMENT', 'TREATMENT_FOLLOW_UP');--> statement-breakpoint
CREATE TYPE "public"."follow_up_send_status" AS ENUM('SENDING', 'ACCEPTED', 'DELIVERED', 'FAILED', 'UNCERTAIN');--> statement-breakpoint
CREATE TABLE "member_follow_up" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_action_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"admin_id" uuid,
	"category" "follow_up_category" NOT NULL,
	"subject" text NOT NULL,
	"language" "preferred_language" NOT NULL,
	"send_status" "follow_up_send_status" DEFAULT 'SENDING' NOT NULL,
	"provider_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_code" text,
	CONSTRAINT "member_follow_up_client_action_id_unique" UNIQUE("client_action_id"),
	CONSTRAINT "member_follow_up_provider_message_id_unique" UNIQUE("provider_message_id"),
	CONSTRAINT "member_follow_up_subject_length_check" CHECK (char_length(trim("member_follow_up"."subject")) between 3 and 160)
);
--> statement-breakpoint
CREATE TABLE "member_follow_up_preference" (
	"member_id" uuid PRIMARY KEY NOT NULL,
	"do_not_remind" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_admin_id" uuid
);
--> statement-breakpoint
ALTER TABLE "member_follow_up" ADD CONSTRAINT "member_follow_up_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_follow_up" ADD CONSTRAINT "member_follow_up_admin_id_user_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_follow_up_preference" ADD CONSTRAINT "member_follow_up_preference_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_follow_up_preference" ADD CONSTRAINT "member_follow_up_preference_updated_by_admin_id_user_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_follow_up_member_category_date_idx" ON "member_follow_up" USING btree ("member_id","category","created_at");--> statement-breakpoint
CREATE INDEX "member_follow_up_admin_date_idx" ON "member_follow_up" USING btree ("admin_id","created_at");