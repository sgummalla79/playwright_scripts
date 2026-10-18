/** What tests need to know about the saved session besides the cookies Playwright stores itself. */
export interface SessionMeta {
  instanceUrl: string;
  savedAt: number;
}

export interface SessionStore {
  /** Path of the Playwright storageState file this store describes. */
  readonly statePath: string;
  saveMeta(meta: SessionMeta): void;
  loadMeta(): SessionMeta | undefined;
  /** true if a session was saved less than maxAgeMs ago and its state file still exists. */
  isFresh(): boolean;
}
