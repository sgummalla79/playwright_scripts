/** Serialized virtual passkey. privateKey is a full MFA factor — protect accordingly. */
export interface StoredPasskey {
  id: string;
  rpId: string;
  userHandle: string;
  privateKey: string;
  publicKey: string;
  signCount: number;
}

export interface PasskeyStore {
  load(): StoredPasskey | undefined;
  save(passkey: StoredPasskey): void;
}
