ALTER TABLE "treatment_access_request" ADD COLUMN "approved_treatment" "reference_treatment";--> statement-breakpoint
ALTER TABLE "treatment_access_request" ADD COLUMN "approved_strength" text;