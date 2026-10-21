export const treatmentItems = ["SEMAGLUTIDE", "TIRZEPATIDE"] as const;
export type Treatment = typeof treatmentItems[number];
export function treatmentFromPath(value: string): Treatment | null {
  return value === "semaglutide" ? "SEMAGLUTIDE" : value === "tirzepatide" ? "TIRZEPATIDE" : null;
}
export function treatmentPath(value: Treatment) { return value.toLowerCase(); }
export function formatPence(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-GB", {style: "currency", currency: "GBP"}).format(value / 100);
}
