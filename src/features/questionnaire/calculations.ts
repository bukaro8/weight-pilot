export function calculateBmi(weightKg: number, heightCm: number) {
  const heightMetres = heightCm / 100;
  return Math.round((weightKg / (heightMetres * heightMetres)) * 10) / 10;
}

export function calculateTargetLossPercentage(currentWeightKg: number, targetWeightKg: number) {
  return Math.round(((currentWeightKg - targetWeightKg) / currentWeightKg) * 1000) / 10;
}
