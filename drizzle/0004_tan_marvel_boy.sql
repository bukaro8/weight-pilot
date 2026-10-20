CREATE TYPE "public"."reference_delivery_method" AS ENUM('STANDARD_NEXT_DAY', 'GUARANTEED_NEXT_DAY');--> statement-breakpoint
CREATE TYPE "public"."reference_treatment" AS ENUM('SEMAGLUTIDE', 'TIRZEPATIDE');--> statement-breakpoint
CREATE TABLE "delivery_reference_price" (
	"method" "reference_delivery_method" PRIMARY KEY NOT NULL,
	"price_pence" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_admin_id" uuid,
	CONSTRAINT "delivery_reference_price_pence_check" CHECK ("delivery_reference_price"."price_pence" between 0 and 1000000)
);
--> statement-breakpoint
CREATE TABLE "treatment_reference_price" (
	"treatment" "reference_treatment" NOT NULL,
	"month_start" integer NOT NULL,
	"price_pence" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_admin_id" uuid,
	CONSTRAINT "treatment_reference_price_treatment_month_start_pk" PRIMARY KEY("treatment","month_start"),
	CONSTRAINT "treatment_reference_price_month_check" CHECK ("treatment_reference_price"."month_start" between 1 and 5),
	CONSTRAINT "treatment_reference_price_pence_check" CHECK ("treatment_reference_price"."price_pence" between 1 and 1000000)
);
--> statement-breakpoint
ALTER TABLE "delivery_reference_price" ADD CONSTRAINT "delivery_reference_price_updated_by_admin_id_user_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_reference_price" ADD CONSTRAINT "treatment_reference_price_updated_by_admin_id_user_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;