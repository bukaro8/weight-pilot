export const treatmentItems = ["SEMAGLUTIDE", "TIRZEPATIDE"] as const;
export type Treatment = typeof treatmentItems[number];
export function treatmentFromPath(value: string): Treatment | null {
  return value === "semaglutide" ? "SEMAGLUTIDE" : value === "tirzepatide" ? "TIRZEPATIDE" : null;
}
export function treatmentPath(value: Treatment) { return value.toLowerCase(); }
export function treatmentCardHref(treatment: Treatment, source: "catalogue" | "report", reportId?: string) {
  const path = `/treatments/${treatmentPath(treatment)}`;
  return source === "report" && reportId ? `${path}/request?reportId=${encodeURIComponent(reportId)}` : path;
}
export function formatPence(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-GB", {style: "currency", currency: "GBP"}).format(value / 100);
}
export function formatPenceWithPoundSymbol(value: number, locale: string) {
  return `£${new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-GB", {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(value / 100)}`;
}
