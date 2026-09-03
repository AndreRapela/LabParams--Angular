import { environment } from '../environments/environment';

export interface SysmlabRuntimeConfig {
  apiUrl?: string;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
}

declare global {
  interface Window {
    __SYSMLAB_CONFIG__?: SysmlabRuntimeConfig;
  }
}

function isLoopback(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '::1'].includes(
    hostname.toLocaleLowerCase('en-US'),
  );
}

function safeUrl(
  value: unknown,
  fallback: string,
  production: boolean,
): string {
  if (typeof value !== 'string' || !value.trim()) return fallback;

  try {
    const parsed = new URL(value.trim());
    const allowedProtocol =
      parsed.protocol === 'https:' ||
      (parsed.protocol === 'http:' &&
        (!production || isLoopback(parsed.hostname)));
    if (
      !allowedProtocol ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    ) {
      return fallback;
    }
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return fallback;
  }
}

function decodeJwtRole(value: string): string | null {
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    );
    const payload = JSON.parse(globalThis.atob(padded)) as { role?: unknown };
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

function isPublishableKey(value: string): boolean {
  if (/^sb_publishable_[A-Za-z0-9._-]+$/.test(value)) return true;
  return value.startsWith('eyJ') && decodeJwtRole(value) === 'anon';
}

function safePublishableKey(value: unknown, fallback: string): string {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (candidate && isPublishableKey(candidate)) return candidate;
  if (isPublishableKey(fallback)) return fallback;
  throw new Error('Configuração pública de autenticação inválida.');
}

export function resolveRuntimeConfig(
  runtime: SysmlabRuntimeConfig | undefined,
  production = environment.production,
): Readonly<Required<SysmlabRuntimeConfig>> {
  return Object.freeze({
    apiUrl: safeUrl(runtime?.apiUrl, environment.apiUrl, production).replace(
      /\/+$/,
      '',
    ),
    supabaseUrl: safeUrl(
      runtime?.supabaseUrl,
      environment.supabaseUrl,
      production,
    ).replace(/\/+$/, ''),
    supabasePublishableKey: safePublishableKey(
      runtime?.supabasePublishableKey,
      environment.supabaseKey,
    ),
  });
}

export const RUNTIME_CONFIG = resolveRuntimeConfig(
  typeof window === 'undefined' ? undefined : window.__SYSMLAB_CONFIG__,
);
