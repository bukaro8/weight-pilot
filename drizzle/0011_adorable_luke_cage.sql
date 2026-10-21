CREATE TABLE "pharmacy_reference_price" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"treatment" "reference_treatment" NOT NULL,
	"strength" text NOT NULL,
	"period_months" integer DEFAULT 1 NOT NULL,
	"price_pence" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_admin_id" uuid,
	CONSTRAINT "pharmacy_reference_price_period_check" CHECK ("pharmacy_reference_price"."period_months" between 1 and 24),
	CONSTRAINT "pharmacy_reference_price_pence_check" CHECK ("pharmacy_reference_price"."price_pence" between 1 and 1000000)
);
--> statement-breakpoint
CREATE TABLE "pharmacy_reference_source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"reference_date" date NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_admin_id" uuid
);
--> statement-breakpoint
ALTER TABLE "pharmacy_reference_price" ADD CONSTRAINT "pharmacy_reference_price_source_id_pharmacy_reference_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."pharmacy_reference_source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_reference_price" ADD CONSTRAINT "pharmacy_reference_price_updated_by_admin_id_user_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_reference_source" ADD CONSTRAINT "pharmacy_reference_source_updated_by_admin_id_user_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pharmacy_reference_price_source_treatment_strength_period_unique" ON "pharmacy_reference_price" USING btree ("source_id","treatment","strength","period_months");--> statement-breakpoint
CREATE INDEX "pharmacy_reference_price_treatment_strength_idx" ON "pharmacy_reference_price" USING btree ("treatment","strength");--> statement-breakpoint
WITH inserted_source AS (
	INSERT INTO "pharmacy_reference_source" ("name", "url", "reference_date")
	VALUES ('Boots Online Doctor', 'https://onlinedoctor.boots.com/weight-loss/important-info', '2026-10-21')
	RETURNING "id"
)
INSERT INTO "pharmacy_reference_price" ("source_id", "treatment", "strength", "period_months", "price_pence")
SELECT inserted_source."id", prices."treatment"::"reference_treatment", prices."strength", 1, prices."price_pence"
FROM inserted_source
CROSS JOIN (VALUES
	('SEMAGLUTIDE', '0.25 mg', 8900),
	('SEMAGLUTIDE', '0.5 mg', 11900),
	('SEMAGLUTIDE', '1 mg', 14900),
	('SEMAGLUTIDE', '1.7 mg', 17900),
	('SEMAGLUTIDE', '2.4 mg', 19900),
	('TIRZEPATIDE', '2.5 mg', 17900),
	('TIRZEPATIDE', '5 mg', 19900),
	('TIRZEPATIDE', '7.5 mg', 25900),
	('TIRZEPATIDE', '10 mg', 29900),
	('TIRZEPATIDE', '12.5 mg', 31900),
	('TIRZEPATIDE', '15 mg', 33900)
) AS prices("treatment", "strength", "price_pence");
