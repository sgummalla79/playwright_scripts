import { createHash, randomBytes } from 'node:crypto';
import { OAUTH_STATE_BYTES, PKCE_VERIFIER_BYTES } from '../config/constants';

export interface PkcePair {
  verifier: string;
  challenge: string;
}

export function createPkcePair(): PkcePair {
  const verifier = randomBytes(PKCE_VERIFIER_BYTES).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function createState(): string {
  return randomBytes(OAUTH_STATE_BYTES).toString('base64url');
}
