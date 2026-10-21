-- Backfill the original reference defaults only where a price was never seeded.
-- ON CONFLICT preserves every administrator-edited price and all existing records.
INSERT INTO "treatment_reference_price" ("treatment", "month_start", "price_pence")
VALUES
  ('SEMAGLUTIDE', 1, 3200), ('SEMAGLUTIDE', 2, 4600),
  ('SEMAGLUTIDE', 3, 6000), ('SEMAGLUTIDE', 4, 7000),
  ('SEMAGLUTIDE', 5, 7500), ('TIRZEPATIDE', 1, 3600),
  ('TIRZEPATIDE', 2, 4900), ('TIRZEPATIDE', 3, 6500),
  ('TIRZEPATIDE', 4, 7500), ('TIRZEPATIDE', 5, 8000)
ON CONFLICT ("treatment", "month_start") DO NOTHING;
--> statement-breakpoint
INSERT INTO "delivery_reference_price" ("method", "price_pence")
VALUES ('STANDARD_NEXT_DAY', 600), ('GUARANTEED_NEXT_DAY', 1085)
ON CONFLICT ("method") DO NOTHING;
