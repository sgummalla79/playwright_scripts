import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** Owner read/write only: these files hold secrets (passkey private key, session cookies). */
export const OWNER_ONLY_FILE_MODE = 0o600;

/** Node reports Windows as 'win32'; there chmod only toggles the read-only flag, so it cannot hide a file from other users. */
const WINDOWS_PLATFORM = 'win32';

let windowsWarningShown = false;

export function restrictToOwner(path: string): void {
  chmodSync(path, OWNER_ONLY_FILE_MODE);
  if (process.platform === WINDOWS_PLATFORM && !windowsWarningShown) {
    windowsWarningShown = true;
    console.warn(
      '[security] Windows ignores POSIX file modes. Keep the .secrets folder inside your own user profile so only your account can read it.',
    );
  }
}

export function writeOwnerOnly(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, { mode: OWNER_ONLY_FILE_MODE });
  restrictToOwner(path);
}
