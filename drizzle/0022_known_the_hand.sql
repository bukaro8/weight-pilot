CREATE TYPE "public"."treatment_payment_send_status" AS ENUM('SENDING', 'ACCEPTED', 'FAILED', 'UNCERTAIN');--> statement-breakpoint
CREATE TABLE "treatment_payment_instruction" (
	"request_id" uuid PRIMARY KEY NOT NULL,
	"treatment" "reference_treatment" NOT NULL,
	"strength" text NOT NULL,
	"item_price_pence" integer NOT NULL,
	"delivery_price_pence" integer NOT NULL,
	"total_pence" integer NOT NULL,
	"prescription_reference" text NOT NULL,
	"supply_authorisation_reference" text NOT NULL,
	"verified_by_admin_id" uuid,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"send_status" "treatment_payment_send_status" DEFAULT 'SENDING' NOT NULL,
	"provider_message_id" text,
	"sent_at" timestamp with time zone,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"failure_code" text,
	CONSTRAINT "treatment_payment_instruction_item_check" CHECK ("treatment_payment_instruction"."item_price_pence" between 1 and 1000000),
	CONSTRAINT "treatment_payment_instruction_delivery_check" CHECK ("treatment_payment_instruction"."delivery_price_pence" between 0 and 1000000),
	CONSTRAINT "treatment_payment_instruction_total_check" CHECK ("treatment_payment_instruction"."total_pence" = "treatment_payment_instruction"."item_price_pence" + "treatment_payment_instruction"."delivery_price_pence")
);
--> statement-breakpoint
CREATE TABLE "treatment_strength_price" (
	"treatment" "reference_treatment" NOT NULL,
	"strength" text NOT NULL,
	"price_pence" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_admin_id" uuid,
	CONSTRAINT "treatment_strength_price_treatment_strength_pk" PRIMARY KEY("treatment","strength"),
	CONSTRAINT "treatment_strength_price_pence_check" CHECK ("treatment_strength_price"."price_pence" between 1 and 1000000)
);
--> statement-breakpoint
ALTER TABLE "treatment_payment_instruction" ADD CONSTRAINT "treatment_payment_instruction_request_id_treatment_access_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."treatment_access_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_payment_instruction" ADD CONSTRAINT "treatment_payment_instruction_verified_by_admin_id_user_id_fk" FOREIGN KEY ("verified_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_strength_price" ADD CONSTRAINT "treatment_strength_price_updated_by_admin_id_user_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;