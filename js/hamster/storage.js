import { createHamsterState, normalizeHamsterState } from "./model.js";

export const HAMSTER_STORAGE_KEY = "peheje-hamster-state-v1";

export function createHamsterRepository({ storage, now = Date.now } = {}) {
  let fallbackState = null;

  function load() {
    try {
      const raw = storage?.getItem(HAMSTER_STORAGE_KEY);
      if (raw) return normalizeHamsterState(JSON.parse(raw), now());
    } catch {
      // Private browsing, denied storage, or malformed data falls back to memory.
    }

    fallbackState = normalizeHamsterState(fallbackState || createHamsterState(now()), now());
    return fallbackState;
  }

  function save(state) {
    const normalized = normalizeHamsterState(state, now());
    fallbackState = normalized;

    try {
      storage?.setItem(HAMSTER_STORAGE_KEY, JSON.stringify(normalized));
      return true;
    } catch {
      return false;
    }
  }

  return { load, save };
}

// A carry code moves progress between browsers by link, with no account.
export function encodeCarryCode(state) {
  const bytes = new TextEncoder().encode(JSON.stringify(normalizeHamsterState(state)));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeCarryCode(code, now = Date.now()) {
  try {
    const binary = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== "object" || !Number.isFinite(value.createdAt)) return null;
    return normalizeHamsterState(value, now);
  } catch {
    return null;
  }
}
