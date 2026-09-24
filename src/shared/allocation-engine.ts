import { fromCents, splitCentsEvenly, splitCentsProportionally, toCents } from './money.js';
import { validateDraft } from './validation.js';
import type { PropertyUtilityResult, SettlementDraft, SettlementResult, UtilityKind, UtilitySummary } from './models.js';

const utilityLabels: Record<UtilityKind, string> = { energy: 'energia' };

function calculateUtility(draft: SettlementDraft, utility: UtilityKind): {
  allocations: Map<string, PropertyUtilityResult>;
  summary: UtilitySummary;
} {
  const bill = draft.bills[utility];
  const allActiveProperties = draft.properties.filter((property) => property.active);
  const properties = allActiveProperties.filter((property) => property[utility].included);
  const fixedCents = toCents(bill.fixedFees.reduce((sum, fee) => sum + Math.max(0, fee.amount), 0));
  const variableCents = Math.max(0, toCents(bill.totalAmount) - fixedCents);
  const values = properties.map((property) => {
    const reading = property[utility].reading;
    return Math.max(0, reading.current - reading.previous);
  });
  const variableParts = splitCentsProportionally(variableCents, values);
  const fixedParts = splitCentsEvenly(fixedCents, properties.length);
  const allocations = new Map<string, PropertyUtilityResult>();

  properties.forEach((property, index) => {
    const rule = property[utility];
    const allocationLabel = `${rule.reading.previous} → ${rule.reading.current}`;
    const fixedAmount = fromCents(fixedParts[index]);
    const variableAmount = fromCents(variableParts[index]);
    allocations.set(property.id, {
      consumption: values[index],
      variableAmount,
      fixedAmount,
      totalAmount: fromCents(fixedParts[index] + variableParts[index]),
      allocationLabel
    });
  });

  allActiveProperties.filter((property) => !property[utility].included).forEach((property) => {
    allocations.set(property.id, {
      consumption: 0,
      variableAmount: 0,
      fixedAmount: 0,
      totalAmount: 0,
      allocationLabel: 'Não participa desta conta'
    });
  });

  return {
    allocations,
    summary: {
      rate: bill.totalConsumption > 0 ? fromCents(variableCents) / bill.totalConsumption : 0,
      fixedFeesTotal: fromCents(fixedCents),
      variableAmount: fromCents(variableCents)
    }
  };
}

export class AllocationEngine {
  calculate(draft: SettlementDraft): SettlementResult {
    const warnings = validateDraft(draft);
    const energy = calculateUtility(draft, 'energy');

    return {
      warnings,
      summaries: { energy: energy.summary },
      properties: draft.properties.filter((property) => property.active).map((property) => {
        const energyResult = energy.allocations.get(property.id)!;
        return {
          property,
          energy: energyResult,
          totalAmount: energyResult.totalAmount
        };
      })
    };
  }
}

export const utilityName = (utility: UtilityKind): string => utilityLabels[utility];
