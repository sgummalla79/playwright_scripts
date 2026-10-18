import { existsSync, readFileSync } from 'node:fs';
import type { SessionConfig } from '../config/config';
import { SESSION_META_SUFFIX } from '../config/constants';
import { restrictToOwner, writeOwnerOnly } from '../storage/ownerOnlyFile';
import type { SessionMeta, SessionStore } from './sessionStore';

export class FileSessionStore implements SessionStore {
  readonly statePath: string;
  private readonly metaPath: string;

  constructor(private readonly config: SessionConfig) {
    this.statePath = config.statePath;
    this.metaPath = `${config.statePath}${SESSION_META_SUFFIX}`;
  }

  /** Call after Playwright writes the storageState file: it creates it world-readable (644). */
  saveMeta(meta: SessionMeta): void {
    writeOwnerOnly(this.metaPath, JSON.stringify(meta, null, 2));
    if (existsSync(this.statePath)) restrictToOwner(this.statePath);
  }

  loadMeta(): SessionMeta | undefined {
    if (!existsSync(this.metaPath)) return undefined;
    return JSON.parse(readFileSync(this.metaPath, 'utf8')) as SessionMeta;
  }

  isFresh(): boolean {
    const meta = this.loadMeta();
    return !!meta && existsSync(this.statePath) && Date.now() - meta.savedAt < this.config.maxAgeMs;
  }
}
