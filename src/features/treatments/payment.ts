export const PAYMENT_DELIVERY_PENCE = 480;

export function calculatePaymentSnapshot(input: {treatment: "SEMAGLUTIDE" | "TIRZEPATIDE"; strength: string; pricePence: number | null}) {
  if (input.pricePence === null || !Number.isInteger(input.pricePence) || input.pricePence < 1) throw new Error("STRENGTH_PRICE_MISSING");
  return {treatment: input.treatment, strength: input.strength, itemPricePence: input.pricePence, deliveryPricePence: PAYMENT_DELIVERY_PENCE, totalPence: input.pricePence + PAYMENT_DELIVERY_PENCE};
}

export function paymentEnvironmentConfigured(input: {accountName?: string; sortCode?: string; accountNumber?: string}) {
  const accountName = input.accountName?.trim() ?? "";
  const sortCode = input.sortCode?.replaceAll(" ", "") ?? "";
  const accountNumber = input.accountNumber?.replaceAll(" ", "") ?? "";
  return Boolean(accountName && accountName !== "XXXX" && /^\d{6}$/u.test(sortCode) && sortCode !== "000000" && /^\d{8}$/u.test(accountNumber) && accountNumber !== "00000000");
}
