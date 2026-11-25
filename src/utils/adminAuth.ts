const ADMIN_PIN_HASH_KEY = 'sibs_mart_admin_pin_hash_v1';
const ADMIN_SESSION_KEY = 'sibs_mart_admin_session_v1';
export const DEFAULT_ADMIN_PIN = '123456';

function fallbackHash(input: string): string {
  const salted = `sibs-mart-pin:${input}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < salted.length; i += 1) {
    const code = salted.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `fb_${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

export async function hashPin(pin: string): Promise<string> {
  const salted = `sibs-mart-admin-v1:${pin}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoded = new TextEncoder().encode(salted);
      const buffer = await crypto.subtle.digest('SHA-256', encoded);
      const bytes = Array.from(new Uint8Array(buffer));
      return `sha256_${bytes.map((b) => b.toString(16).padStart(2, '0')).join('')}`;
    } catch {
      return fallbackHash(pin);
    }
  }
  return fallbackHash(pin);
}

export async function getDefaultPinHash(): Promise<string> {
  return hashPin(DEFAULT_ADMIN_PIN);
}

export function getCachedPinHash(): string | null {
  try {
    return localStorage.getItem(ADMIN_PIN_HASH_KEY);
  } catch {
    return null;
  }
}

export function saveCachedPinHash(pinHash: string): void {
  try {
    localStorage.setItem(ADMIN_PIN_HASH_KEY, pinHash);
  } catch {
    // Ignore storage errors
  }
}

export async function verifyAdminPin(
  pin: string,
  activeHash: string | null
): Promise<boolean> {
  const trimmed = pin.trim();
  if (!trimmed) return false;
  const candidateHash = await hashPin(trimmed);
  const targetHash = activeHash || (await getDefaultPinHash());
  return candidateHash === targetHash;
}

export async function isHashDefaultAdminPin(
  activeHash: string | null
): Promise<boolean> {
  if (!activeHash) return true;
  const defaultHash = await getDefaultPinHash();
  return activeHash === defaultHash;
}

export function loadAdminSession(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'active';
  } catch {
    return false;
  }
}

export function saveAdminSession(active: boolean): void {
  try {
    if (active) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'active');
    } else {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}
