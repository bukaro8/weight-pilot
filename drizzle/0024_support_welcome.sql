ALTER TABLE "message_conversation" ADD COLUMN "support_welcome_sent_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "message_conversation" AS conversation
SET "support_welcome_sent_at" = conversation."updated_at"
WHERE EXISTS (
  SELECT 1 FROM "private_message" AS message
  WHERE message."conversation_id" = conversation."id"
    AND message."sender_id" = conversation."member_id"
);
