ALTER TABLE "consultation_report" ADD COLUMN "member_viewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "treatment_access_request" ADD COLUMN "member_viewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "treatment_access_request" ADD COLUMN "admin_viewed_at" timestamp with time zone;