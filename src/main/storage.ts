import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { PersistedState } from '../shared/models.js';
import { createDefaultState } from '../shared/defaults.js';

export class LocalStateRepository {
  private readonly filePath: string;

  constructor(userDataPath: string) {
    this.filePath = join(userDataPath, 'rateio-justo-alugueis.json');
  }

  async load(): Promise<PersistedState> {
    try {
      return this.migrate(JSON.parse(await readFile(this.filePath, 'utf8')) as PersistedState);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return createDefaultState();
      throw new Error('Não foi possível ler os dados locais do Grupo Fit Seven - Salas Comerciais.', { cause: error });
    }
  }

  async save(state: PersistedState): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(state, null, 2), 'utf8');
    await rename(temporaryPath, this.filePath);
  }

  /** Normaliza arquivos de versões anteriores sem descartar os dados do usuário. */
  private migrate(state: PersistedState): PersistedState {
    if (!state?.draft) throw new Error('Arquivo de dados local inválido.');
    state.draft.properties.forEach((property) => {
      property.energy.included ??= true;
      property.energy.reading ??= { previous: 0, current: 0 };
    });
    state.schemaVersion = 1;
    return state;
  }
}
