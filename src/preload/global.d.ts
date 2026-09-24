import type { PersistedState, SettlementDraft } from '../shared/models.js';

declare global {
  interface Window {
    rateioApi: {
      loadState(): Promise<PersistedState>;
      saveState(state: PersistedState): Promise<void>;
      exportPdf(draft: SettlementDraft): Promise<{ filePath: string; openError: string }>;
    };
  }
}

export {};
