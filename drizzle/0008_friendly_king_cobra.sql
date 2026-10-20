ALTER TABLE "questionnaire_review_request" ADD COLUMN "report_language" "preferred_language";--> statement-breakpoint
UPDATE "questionnaire_review_request" AS "request"
SET "report_language" = COALESCE(
  (SELECT "language" FROM "consultation_report" WHERE "review_request_id" = "request"."id"),
  (SELECT "preferred_language" FROM "user" WHERE "id" = "request"."requested_by_user_id"),
  'en'::"preferred_language"
);--> statement-breakpoint
ALTER TABLE "questionnaire_review_request" ALTER COLUMN "report_language" SET DEFAULT 'en';--> statement-breakpoint
ALTER TABLE "questionnaire_review_request" ALTER COLUMN "report_language" SET NOT NULL;
