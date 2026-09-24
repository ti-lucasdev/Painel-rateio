import type { PersistedState, SettlementDraft } from './models.js';

export function createDefaultDraft(): SettlementDraft {
  return {
    referenceMonth: '',
    readingDate: '',
    properties: [],
    bills: {
      energy: { provider: '', accountNumber: '', totalAmount: 0, totalConsumption: 0, fixedFees: [] }
    }
  };
}

export function createDefaultState(): PersistedState {
  return { schemaVersion: 1, draft: createDefaultDraft() };
}
