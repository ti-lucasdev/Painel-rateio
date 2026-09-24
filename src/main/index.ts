import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { generateSettlementPdf } from './pdf.js';
import { LocalStateRepository } from './storage.js';
import type { PersistedState, SettlementDraft } from '../shared/models.js';

let mainWindow: BrowserWindow | undefined;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    title: 'Grupo Fit Seven - Salas Comerciais',
    icon: join(app.getAppPath(), 'build/icon.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  const repository = new LocalStateRepository(app.getPath('userData'));
  ipcMain.handle('state:load', () => repository.load());
  ipcMain.handle('state:save', (_event, state: PersistedState) => repository.save(state));
  ipcMain.handle('pdf:export', async (event, draft: SettlementDraft) => {
    if (event.sender !== mainWindow?.webContents) throw new Error('Janela não autorizada.');
    const directory = join(app.getPath('documents'), 'Grupo Fit Seven - Salas Comerciais');
    await mkdir(directory, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = join(directory, `Rateio-${timestamp}-${randomUUID().slice(0, 8)}.pdf`);
    await generateSettlementPdf(draft, filePath);
    const openError = await shell.openPath(filePath);
    return { filePath, openError };
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
