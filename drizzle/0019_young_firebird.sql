CREATE TYPE "public"."invitation_kind" AS ENUM('STANDARD', 'MASTER');--> statement-breakpoint
ALTER TABLE "referral" DROP CONSTRAINT "referral_invitation_id_unique";--> statement-breakpoint
ALTER TABLE "invitation" ALTER COLUMN "expires_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "kind" "invitation_kind" DEFAULT 'STANDARD' NOT NULL;--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "usage_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "referral_invitation_id_idx" ON "referral" USING btree ("invitation_id");--> statement-breakpoint
UPDATE "invitation" SET "usage_count" = 1 WHERE "redeemed_at" IS NOT NULL;
