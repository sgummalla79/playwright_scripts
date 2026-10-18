import type { BrowserContext } from '@playwright/test';
import type { PasskeyStore, StoredPasskey } from './passkeyStore';

/** Seeds the stored passkey and installs the virtual authenticator (install must precede navigation). */
export async function installStoredPasskey(context: BrowserContext, store: PasskeyStore): Promise<StoredPasskey> {
  const saved = store.load();
  if (!saved) throw new Error('No stored passkey found. Run the bootstrap project first.');
  await context.credentials.create(saved.rpId, saved);
  await context.credentials.install();
  return saved;
}

/** Installs an empty virtual authenticator so the page can register a new passkey. */
export async function installEmptyAuthenticator(context: BrowserContext): Promise<void> {
  await context.credentials.install();
}

/** Persists the authenticator's current state (notably the incremented signCount). */
export async function persistPasskey(context: BrowserContext, store: PasskeyStore, id?: string): Promise<StoredPasskey> {
  const credentials = await context.credentials.get(id ? { id } : {});
  if (credentials.length !== 1) {
    throw new Error(`Expected exactly one virtual passkey, found ${credentials.length}`);
  }
  store.save(credentials[0]);
  return credentials[0];
}
