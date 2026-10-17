// src/shared-kernel/domain/percentage.ts

function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  const numerator = BigInt(part) * 1000n;
  const denominator = BigInt(total);
  return Number((numerator + denominator / 2n) / denominator) / 10;
}

function calculateVariation(base: number, compared: number): number | null {
  if (base === 0) return null;
  const numerator = BigInt(compared - base) * 10000n;
  const absoluteNumerator = numerator < 0n ? -numerator : numerator;
  const rounded = (absoluteNumerator + BigInt(Math.abs(base)) / 2n) / BigInt(Math.abs(base));
  return Number(numerator < 0n ? -rounded : rounded) / 100;
}

export { calculatePercentage, calculateVariation };
