CREATE TYPE "public"."treatment_communication_delivery_status" AS ENUM('PENDING', 'DELIVERED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."treatment_communication_type" AS ENUM('DECISION_NOTICE', 'ADMIN_UPDATE', 'PAYMENT_INSTRUCTIONS');--> statement-breakpoint
CREATE TABLE "treatment_request_communication" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"client_message_id" uuid,
	"type" "treatment_communication_type" NOT NULL,
	"language" "preferred_language" NOT NULL,
	"treatment" "reference_treatment",
	"strength" text,
	"item_price_pence" integer,
	"delivery_price_pence" integer,
	"total_pence" integer,
	"recipient" text,
	"subject" text,
	"html" text,
	"plain_text" text,
	"send_status" "treatment_payment_send_status" DEFAULT 'SENDING' NOT NULL,
	"delivery_status" "treatment_communication_delivery_status" DEFAULT 'PENDING' NOT NULL,
	"provider_message_id" text,
	"failure_code" text,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"authorised_supply_id" uuid,
	"created_by_admin_id" uuid,
	CONSTRAINT "treatment_communication_total_check" CHECK ("treatment_request_communication"."total_pence" is null or ("treatment_request_communication"."item_price_pence" is not null and "treatment_request_communication"."delivery_price_pence" is not null and "treatment_request_communication"."total_pence" = "treatment_request_communication"."item_price_pence" + "treatment_request_communication"."delivery_price_pence"))
);
--> statement-breakpoint
CREATE TABLE "treatment_supply_authorisation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"treatment" "reference_treatment" NOT NULL,
	"strength" text NOT NULL,
	"prescription_reference" text NOT NULL,
	"supply_authorisation_reference" text NOT NULL,
	"verified_by_admin_id" uuid,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "treatment_request_communication" ADD CONSTRAINT "treatment_request_communication_request_id_treatment_access_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."treatment_access_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_request_communication" ADD CONSTRAINT "treatment_request_communication_authorised_supply_id_treatment_supply_authorisation_id_fk" FOREIGN KEY ("authorised_supply_id") REFERENCES "public"."treatment_supply_authorisation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_request_communication" ADD CONSTRAINT "treatment_request_communication_created_by_admin_id_user_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_supply_authorisation" ADD CONSTRAINT "treatment_supply_authorisation_request_id_treatment_access_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."treatment_access_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_supply_authorisation" ADD CONSTRAINT "treatment_supply_authorisation_verified_by_admin_id_user_id_fk" FOREIGN KEY ("verified_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "treatment_communication_request_client_uidx" ON "treatment_request_communication" USING btree ("request_id","client_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "treatment_communication_provider_uidx" ON "treatment_request_communication" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "treatment_communication_request_date_idx" ON "treatment_request_communication" USING btree ("request_id","attempted_at");--> statement-breakpoint
CREATE INDEX "treatment_supply_authorisation_request_idx" ON "treatment_supply_authorisation" USING btree ("request_id","verified_at");
--> statement-breakpoint
-- Insert only absent strength prices. Existing administrator edits remain authoritative.
INSERT INTO "treatment_strength_price" ("treatment", "strength", "price_pence") VALUES
('TIRZEPATIDE', '2.5 mg', 5500), ('TIRZEPATIDE', '5 mg', 7500),
('TIRZEPATIDE', '7.5 mg', 10000), ('TIRZEPATIDE', '10 mg', 11500),
('TIRZEPATIDE', '12.5 mg', 12000), ('TIRZEPATIDE', '15 mg', 12000),
('SEMAGLUTIDE', '0.25 mg', 3200), ('SEMAGLUTIDE', '0.5 mg', 4600),
('SEMAGLUTIDE', '1 mg', 6000), ('SEMAGLUTIDE', '1.7 mg', 7000),
('SEMAGLUTIDE', '2.4 mg', 7500)
ON CONFLICT ("treatment", "strength") DO NOTHING;
--> statement-breakpoint
-- Legacy notices did not store rendered content or the historical recipient.
INSERT INTO "treatment_request_communication" ("request_id", "type", "language", "treatment", "strength", "send_status", "provider_message_id", "attempted_at", "accepted_at")
SELECT r."id", 'DECISION_NOTICE', r."language", r."approved_treatment", r."approved_strength", 'ACCEPTED', r."approval_email_provider_message_id", r."approval_email_accepted_at", r."approval_email_accepted_at"
FROM "treatment_access_request" r
WHERE r."approval_email_provider_message_id" IS NOT NULL AND r."approval_email_accepted_at" IS NOT NULL;
--> statement-breakpoint
INSERT INTO "treatment_supply_authorisation" ("request_id", "treatment", "strength", "prescription_reference", "supply_authorisation_reference", "verified_by_admin_id", "verified_at")
SELECT p."request_id", p."treatment", p."strength", p."prescription_reference", p."supply_authorisation_reference", p."verified_by_admin_id", p."verified_at"
FROM "treatment_payment_instruction" p;
--> statement-breakpoint
INSERT INTO "treatment_request_communication" ("request_id", "type", "language", "treatment", "strength", "item_price_pence", "delivery_price_pence", "total_pence", "send_status", "provider_message_id", "failure_code", "attempted_at", "accepted_at", "authorised_supply_id", "created_by_admin_id")
SELECT p."request_id", 'PAYMENT_INSTRUCTIONS', r."language", p."treatment", p."strength", p."item_price_pence", p."delivery_price_pence", p."total_pence", p."send_status", p."provider_message_id", p."failure_code", p."attempted_at", p."sent_at", a."id", p."verified_by_admin_id"
FROM "treatment_payment_instruction" p
JOIN "treatment_access_request" r ON r."id" = p."request_id"
LEFT JOIN "treatment_supply_authorisation" a ON a."request_id" = p."request_id";
