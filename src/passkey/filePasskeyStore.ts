import { existsSync, readFileSync } from 'node:fs';
import type { PasskeyStoreConfig } from '../config/config';
import { writeOwnerOnly } from '../storage/ownerOnlyFile';
import type { PasskeyStore, StoredPasskey } from './passkeyStore';

export class FilePasskeyStore implements PasskeyStore {
  constructor(private readonly config: PasskeyStoreConfig) {}

  load(): StoredPasskey | undefined {
    if (!existsSync(this.config.storePath)) return undefined;
    return JSON.parse(readFileSync(this.config.storePath, 'utf8')) as StoredPasskey;
  }

  save(passkey: StoredPasskey): void {
    writeOwnerOnly(this.config.storePath, JSON.stringify(passkey, null, 2));
  }
}
