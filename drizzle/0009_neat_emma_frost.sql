CREATE TYPE "public"."message_sender_role" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
CREATE TABLE "message_conversation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_conversation_member_id_unique" UNIQUE("member_id")
);
--> statement-breakpoint
CREATE TABLE "private_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"sender_role" "message_sender_role" NOT NULL,
	"client_message_id" uuid NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "private_message_client_message_id_unique" UNIQUE("client_message_id"),
	CONSTRAINT "private_message_body_length_check" CHECK (char_length(trim("private_message"."body")) between 1 and 4000)
);
--> statement-breakpoint
ALTER TABLE "message_conversation" ADD CONSTRAINT "message_conversation_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private_message" ADD CONSTRAINT "private_message_conversation_id_message_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."message_conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private_message" ADD CONSTRAINT "private_message_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_conversation_updated_at_idx" ON "message_conversation" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "private_message_conversation_created_idx" ON "private_message" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "private_message_unread_idx" ON "private_message" USING btree ("conversation_id","read_at","sender_id");