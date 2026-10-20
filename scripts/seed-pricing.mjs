import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const treatmentPrices = [
  ["SEMAGLUTIDE", 1, 3200], ["SEMAGLUTIDE", 2, 4600], ["SEMAGLUTIDE", 3, 6000],
  ["SEMAGLUTIDE", 4, 7000], ["SEMAGLUTIDE", 5, 7500],
  ["TIRZEPATIDE", 1, 3600], ["TIRZEPATIDE", 2, 4900], ["TIRZEPATIDE", 3, 6500],
  ["TIRZEPATIDE", 4, 7500], ["TIRZEPATIDE", 5, 8000],
];
const deliveryPrices = [["STANDARD_NEXT_DAY", 600], ["GUARANTEED_NEXT_DAY", 1085]];

const sql = postgres(databaseUrl, {prepare: false, max: 1});
try {
  await sql.begin(async (transaction) => {
    await transaction`select pg_advisory_xact_lock(hashtext('weightpilot-reference-pricing-seed'))`;
    for (const [treatment, monthStart, pricePence] of treatmentPrices) {
      await transaction`
        insert into treatment_reference_price (treatment, month_start, price_pence)
        values (${treatment}, ${monthStart}, ${pricePence})
        on conflict (treatment, month_start) do nothing
      `;
    }
    for (const [method, pricePence] of deliveryPrices) {
      await transaction`
        insert into delivery_reference_price (method, price_pence)
        values (${method}, ${pricePence})
        on conflict (method) do nothing
      `;
    }
  });
  console.log("Reference pricing seed complete. Existing administrator-edited prices were preserved.");
} finally {
  await sql.end();
}
