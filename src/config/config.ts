import * as dotenv from 'dotenv';
import { ENV_DEFAULTS, ENV_KEYS } from './constants';

export interface WebServerFlowConfig {
  loginUrl: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  username: string;
  password: string;
}

export interface LoginFlowConfig {
  returnPath: string;
  loginTimeoutMs: number;
}

export interface PasskeyStoreConfig {
  storePath: string;
}

export interface SessionConfig {
  statePath: string;
  maxAgeMs: number;
}

type Env = Record<string, string | undefined>;

function required(env: Env, key: string): string {
  const value = env[key];
  if (!value) throw new Error(`Missing required env var ${key} (see .env.example)`);
  return value;
}

function optionalNumber(env: Env, key: string, fallback: number): number {
  const raw = env[key];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) throw new Error(`Env var ${key} must be a number, got "${raw}"`);
  return parsed;
}

export function loadEnv(): Env {
  dotenv.config({ quiet: true });
  return process.env;
}

export function loadWebServerFlowConfig(env: Env = loadEnv()): WebServerFlowConfig {
  return {
    loginUrl: required(env, ENV_KEYS.loginUrl),
    clientId: required(env, ENV_KEYS.clientId),
    clientSecret: required(env, ENV_KEYS.clientSecret),
    callbackUrl: required(env, ENV_KEYS.callbackUrl),
    username: required(env, ENV_KEYS.username),
    password: required(env, ENV_KEYS.password),
  };
}

export function loadLoginFlowConfig(env: Env = loadEnv()): LoginFlowConfig {
  return {
    returnPath: env[ENV_KEYS.returnPath] || ENV_DEFAULTS.returnPath,
    loginTimeoutMs: optionalNumber(env, ENV_KEYS.loginTimeoutMs, ENV_DEFAULTS.loginTimeoutMs),
  };
}

export function loadPasskeyStoreConfig(env: Env = loadEnv()): PasskeyStoreConfig {
  return { storePath: required(env, ENV_KEYS.passkeyStorePath) };
}

export function loadSessionConfig(env: Env = loadEnv()): SessionConfig {
  return {
    statePath: env[ENV_KEYS.sessionStatePath] || ENV_DEFAULTS.sessionStatePath,
    maxAgeMs: optionalNumber(env, ENV_KEYS.sessionMaxAgeMs, ENV_DEFAULTS.sessionMaxAgeMs),
  };
}
