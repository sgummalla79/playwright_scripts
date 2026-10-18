import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { PasskeyStoreConfig } from '../config/config';
import type { PasskeyStore, StoredPasskey } from './passkeyStore';

/** Owner read/write only: the file holds a replayable MFA private key. */
const OWNER_ONLY_FILE_MODE = 0o600;

export class FilePasskeyStore implements PasskeyStore {
  constructor(private readonly config: PasskeyStoreConfig) {}

  load(): StoredPasskey | undefined {
    if (!existsSync(this.config.storePath)) return undefined;
    return JSON.parse(readFileSync(this.config.storePath, 'utf8')) as StoredPasskey;
  }

  save(passkey: StoredPasskey): void {
    mkdirSync(dirname(this.config.storePath), { recursive: true });
    writeFileSync(this.config.storePath, JSON.stringify(passkey, null, 2), { mode: OWNER_ONLY_FILE_MODE });
    chmodSync(this.config.storePath, OWNER_ONLY_FILE_MODE);
  }
}
