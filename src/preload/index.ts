import { contextBridge, ipcRenderer } from 'electron';
import type { PersistedState, SettlementDraft } from '../shared/models.js';

const rateioApi = {
  loadState: (): Promise<PersistedState> => ipcRenderer.invoke('state:load'),
  saveState: (state: PersistedState): Promise<void> => ipcRenderer.invoke('state:save', state),
  exportPdf: (draft: SettlementDraft): Promise<{ filePath: string; openError: string }> => ipcRenderer.invoke('pdf:export', draft)
};

contextBridge.exposeInMainWorld('rateioApi', rateioApi);
