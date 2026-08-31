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
