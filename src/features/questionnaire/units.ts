export type MeasurementSystem = "METRIC" | "IMPERIAL";

const centimetersPerInch = 2.54;
const poundsPerKilogram = 2.2046226218487757;
const poundsPerStone = 14;

function roundToOne(value: number) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

export function imperialHeightToCm(feet: number, inches: number) {
  return roundToOne((feet * 12 + inches) * centimetersPerInch);
}

export function metricHeightToImperial(centimeters: number) {
  const totalInches = Math.round(centimeters / centimetersPerInch);
  return {feet: Math.floor(totalInches / 12), inches: totalInches % 12};
}

export function imperialWeightToKg(stones: number, pounds: number) {
  return roundToOne((stones * poundsPerStone + pounds) / poundsPerKilogram);
}

export function metricWeightToImperial(kilograms: number) {
  // Imperial questionnaire fields use whole pounds, matching height's
  // whole-inch display and avoiding false precision after metric storage.
  const totalPounds = Math.round(kilograms * poundsPerKilogram);
  const stones = Math.floor(totalPounds / poundsPerStone);
  return {stones, pounds: totalPounds - stones * poundsPerStone};
}
