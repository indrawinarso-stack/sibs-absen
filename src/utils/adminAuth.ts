const ADMIN_PIN_HASH_KEY = 'sibs_mart_admin_pin_hash_v1';
const ADMIN_SESSION_KEY = 'sibs_mart_admin_session_v1';
const DEFAULT_ADMIN_PIN = '123456';

function fallbackHash(input: string): string {
  // Deterministic salted FNV-1a-like fallback for non-HTTPS local contexts without crypto.subtle
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

async function getStoredPinHash(): Promise<string> {
  try {
    const stored = localStorage.getItem(ADMIN_PIN_HASH_KEY);
    if (stored) return stored;
    const defaultHash = await hashPin(DEFAULT_ADMIN_PIN);
    localStorage.setItem(ADMIN_PIN_HASH_KEY, defaultHash);
    return defaultHash;
  } catch {
    return hashPin(DEFAULT_ADMIN_PIN);
  }
}

export async function verifyAdminPin(pin: string): Promise<boolean> {
  const trimmed = pin.trim();
  if (!trimmed) return false;
  const storedHash = await getStoredPinHash();
  const candidateHash = await hashPin(trimmed);
  return candidateHash === storedHash;
}

export async function isUsingDefaultAdminPin(): Promise<boolean> {
  const storedHash = await getStoredPinHash();
  const defaultHash = await hashPin(DEFAULT_ADMIN_PIN);
  return storedHash === defaultHash;
}

export async function changeAdminPin(
  currentPin: string,
  newPin: string
): Promise<{ ok: boolean; error?: string }> {
  const validCurrent = await verifyAdminPin(currentPin);
  if (!validCurrent) {
    return { ok: false, error: 'PIN Admin saat ini tidak sesuai.' };
  }

  const trimmedNew = newPin.trim();
  if (trimmedNew.length < 4) {
    return { ok: false, error: 'PIN baru minimal 4 karakter.' };
  }
  if (trimmedNew.length > 24) {
    return { ok: false, error: 'PIN baru maksimal 24 karakter.' };
  }

  try {
    const newHash = await hashPin(trimmedNew);
    localStorage.setItem(ADMIN_PIN_HASH_KEY, newHash);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menyimpan PIN baru ke browser.' };
  }
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
