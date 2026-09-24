/** Conversão em centavos evita erros de ponto flutuante na divisão monetária. */
export const toCents = (value: number): number => Math.round((Number.isFinite(value) ? value : 0) * 100);
export const fromCents = (value: number): number => value / 100;

export function splitCentsEvenly(totalCents: number, quantity: number): number[] {
  if (quantity <= 0) return [];
  const sign = totalCents < 0 ? -1 : 1;
  const absolute = Math.abs(totalCents);
  const base = Math.floor(absolute / quantity);
  const remainder = absolute % quantity;
  return Array.from({ length: quantity }, (_, index) => sign * (base + (index < remainder ? 1 : 0)));
}

export function splitCentsProportionally(totalCents: number, weights: number[]): number[] {
  const sanitized = weights.map((weight) => Math.max(0, weight));
  const totalWeight = sanitized.reduce((sum, value) => sum + value, 0);
  if (totalWeight === 0) return sanitized.map(() => 0);

  const raw = sanitized.map((weight) => (totalCents * weight) / totalWeight);
  const whole = raw.map((value) => Math.floor(value));
  let remainder = totalCents - whole.reduce((sum, value) => sum + value, 0);
  const indexes = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((left, right) => right.fraction - left.fraction);

  for (let index = 0; remainder > 0; index += 1, remainder -= 1) whole[indexes[index % indexes.length].index] += 1;
  return whole;
}

