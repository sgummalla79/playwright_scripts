import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { SessionConfig } from '../config/config';
import { SESSION_META_SUFFIX } from '../config/constants';
import type { SessionMeta, SessionStore } from './sessionStore';

/** Owner read/write only: session cookies are as sensitive as a password. */
const OWNER_ONLY_FILE_MODE = 0o600;

export class FileSessionStore implements SessionStore {
  readonly statePath: string;
  private readonly metaPath: string;

  constructor(private readonly config: SessionConfig) {
    this.statePath = config.statePath;
    this.metaPath = `${config.statePath}${SESSION_META_SUFFIX}`;
  }

  saveMeta(meta: SessionMeta): void {
    mkdirSync(dirname(this.metaPath), { recursive: true });
    writeFileSync(this.metaPath, JSON.stringify(meta, null, 2), { mode: OWNER_ONLY_FILE_MODE });
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
