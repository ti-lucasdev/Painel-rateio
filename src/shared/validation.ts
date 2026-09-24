import type { SettlementDraft, UtilityKind } from './models.js';

const UTILITY_LABEL: Record<UtilityKind, string> = { energy: 'energia' };

export function validateDraft(draft: SettlementDraft): string[] {
  const warnings: string[] = [];
  const activeProperties = draft.properties.filter((property) => property.active);

  if (activeProperties.length === 0) warnings.push('Cadastre ao menos um imóvel ativo para calcular o rateio.');

  (['energy'] as const).forEach((utility) => {
    const label = UTILITY_LABEL[utility];
    const participatingProperties = activeProperties.filter((property) => property[utility].included);

    if (participatingProperties.length === 0 && activeProperties.length > 0) warnings.push(`Selecione ao menos um imóvel participante da conta de ${label}.`);

    const measuredConsumption = participatingProperties
      .reduce((total, property) => {
        const reading = property[utility].reading;
        if (!reading) {
          warnings.push(`${property.name}: informe as duas leituras de ${label}.`);
          return total;
        }
        if (reading.current < reading.previous) warnings.push(`${property.name}: a leitura atual de ${label} não pode ser menor que a anterior.`);
        return total + Math.max(0, reading.current - reading.previous);
      }, 0);

    const bill = draft.bills[utility];
    if (bill.totalConsumption < measuredConsumption) warnings.push(`O consumo medido de ${label} (${measuredConsumption}) é maior que o consumo total informado na fatura (${bill.totalConsumption}).`);
    if (bill.totalAmount < bill.fixedFees.reduce((sum, fee) => sum + fee.amount, 0)) warnings.push(`As taxas fixas de ${label} superam o valor total da fatura.`);
  });

  return warnings;
}
