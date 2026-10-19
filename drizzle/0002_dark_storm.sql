CREATE TYPE "public"."referral_type" AS ENUM('REGISTRATION', 'REACTIVATION');--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "referral" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invitation_id" uuid NOT NULL,
	"referrer_user_id" uuid NOT NULL,
	"referred_user_id" uuid NOT NULL,
	"type" "referral_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_invitation_id_unique" UNIQUE("invitation_id")
);
--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_redeemed_by_user_id_user_id_fk" FOREIGN KEY ("redeemed_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral" ADD CONSTRAINT "referral_invitation_id_invitation_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral" ADD CONSTRAINT "referral_referrer_user_id_user_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral" ADD CONSTRAINT "referral_referred_user_id_user_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invitation_creator_id_idx" ON "invitation" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "invitation_redeemed_by_user_id_idx" ON "invitation" USING btree ("redeemed_by_user_id");--> statement-breakpoint
CREATE INDEX "invitation_expires_at_idx" ON "invitation" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "referral_referrer_user_id_idx" ON "referral" USING btree ("referrer_user_id");--> statement-breakpoint
CREATE INDEX "referral_referred_user_id_idx" ON "referral" USING btree ("referred_user_id");